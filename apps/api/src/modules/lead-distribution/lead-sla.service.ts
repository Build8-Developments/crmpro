import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  NotificationType,
  SlaAction,
} from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantStatusService } from '../../common/tenant/tenant-status.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import { SchedulerService } from '../scheduler/scheduler.service';
import { LeadDistributionService } from './lead-distribution.service';

export const LEAD_SLA_JOB_NAME = 'lead-sla';
const SLA_SCAN_INTERVAL_MS = 60 * 1000;
const SLA_BATCH_SIZE = 200;

/**
 * Speed-to-lead: when an assigned lead gets no first contact within the
 * tenant's SLA, mark it breached (once), tell the owner's team leader — or the
 * owners when there is none — and, if configured, hand it to the next agent.
 */
@Injectable()
export class LeadSlaService implements OnModuleInit {
  private readonly logger = new Logger(LeadSlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerService,
    private readonly tenantStatus: TenantStatusService,
    private readonly leadActivityService: LeadActivityService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly distribution: LeadDistributionService,
  ) {}

  onModuleInit(): void {
    this.scheduler.register({
      name: LEAD_SLA_JOB_NAME,
      everyMs: SLA_SCAN_INTERVAL_MS,
      run: async () => {
        await this.runScan();
      },
    });
  }

  async runScan(now = new Date()): Promise<number> {
    const tenants = await this.prisma.tenantSettings.findMany({
      where: { slaFirstResponseMinutes: { not: null } },
      select: {
        tenantId: true,
        slaFirstResponseMinutes: true,
        slaAction: true,
      },
    });

    let breached = 0;

    for (const settings of tenants) {
      if (!(await this.tenantStatus.isTenantActive(settings.tenantId))) {
        continue;
      }

      breached += await this.scanTenant(
        settings.tenantId,
        settings.slaFirstResponseMinutes!,
        settings.slaAction,
        now,
      );
    }

    if (breached > 0) {
      this.logger.log(`SLA breaches recorded: ${breached}`);
    }

    return breached;
  }

  private async scanTenant(
    tenantId: string,
    minutes: number,
    action: SlaAction,
    now: Date,
  ): Promise<number> {
    const deadline = new Date(now.getTime() - minutes * 60_000);
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: LeadStatus.OPEN,
        pipelineStage: { isClosed: false },
        assignedUserId: { not: null },
        firstContactedAt: null,
        slaBreachedAt: null,
        assignedAt: { lt: deadline },
      },
      orderBy: { assignedAt: 'asc' },
      take: SLA_BATCH_SIZE,
      select: {
        id: true,
        fullName: true,
        assignedUserId: true,
        assignedAt: true,
        assignedUser: {
          select: { name: true, team: { select: { leaderUserId: true } } },
        },
      },
    });

    let count = 0;

    for (const lead of leads) {
      const ownerId = lead.assignedUserId!;
      const reassignment = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.lead.updateMany({
          where: { id: lead.id, slaBreachedAt: null, firstContactedAt: null },
          data: { slaBreachedAt: now },
        });

        if (claimed.count === 0) {
          return { claimed: false as const };
        }

        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: lead.id,
            actorUserId: null,
            eventType: LeadActivityEventType.SLA_BREACHED,
            metadata: {
              slaMinutes: minutes,
              ownerUserId: ownerId,
              ownerName: lead.assignedUser?.name ?? null,
              assignedAt: lead.assignedAt?.toISOString() ?? null,
            },
          },
          tx,
        );

        const moved =
          action === SlaAction.REASSIGN
            ? await this.distribution.assignNext(tx, tenantId, lead.id, {
                excludeUserId: ownerId,
                reason: 'sla_breach',
              })
            : null;

        if (moved) {
          // The new owner starts with a fresh clock but is not re-escalated:
          // reassignment happens at most once per lead.
          await tx.lead.update({
            where: { id: lead.id },
            data: { slaBreachedAt: now },
          });
        }

        return { claimed: true as const, moved };
      });

      if (!reassignment.claimed) {
        continue;
      }

      count += 1;

      if (reassignment.moved) {
        this.distribution.afterAssign(tenantId, reassignment.moved);
      }

      await this.notifyEscalation(tenantId, lead, ownerId, minutes);
    }

    return count;
  }

  private async notifyEscalation(
    tenantId: string,
    lead: {
      id: string;
      fullName: string;
      assignedUser: {
        name: string;
        team: { leaderUserId: string | null } | null;
      } | null;
    },
    ownerId: string,
    minutes: number,
  ): Promise<void> {
    const leaderId = lead.assignedUser?.team?.leaderUserId;
    const recipients =
      leaderId && leaderId !== ownerId
        ? [leaderId]
        : await this.findTenantWideUsers(tenantId, ownerId);

    for (const recipientUserId of recipients) {
      await this.notificationTrigger.trigger({
        tenantId,
        recipientUserId,
        type: NotificationType.SLA_BREACHED,
        metadata: {
          leadId: lead.id,
          leadName: lead.fullName,
          ownerName: lead.assignedUser?.name ?? null,
          slaMinutes: minutes,
          title: 'Lead waiting too long',
          message: `${lead.fullName} has not been contacted by ${lead.assignedUser?.name ?? 'its owner'} within ${minutes} minutes.`,
        },
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'lead',
          entityId: lead.id,
          type: NotificationType.SLA_BREACHED,
          recipientUserId,
        }),
      });
    }
  }

  /** Users who oversee the whole tenant (lead.read-all), excluding the owner. */
  private async findTenantWideUsers(
    tenantId: string,
    excludeUserId: string,
  ): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        id: { not: excludeUserId },
        role: {
          permissions: {
            some: { permission: { key: PERMISSIONS.LEAD_READ_ALL } },
          },
        },
      },
      select: { id: true },
      take: 20,
    });

    return users.map((user) => user.id);
  }
}
