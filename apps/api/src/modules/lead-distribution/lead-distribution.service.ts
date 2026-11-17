import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LeadActivityEventType, LeadStatus, Prisma } from '@crmpro/database';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import {
  DOMAIN_EVENT_TYPES,
  LeadAssignedEvent,
  type LeadCreatedEvent,
} from '../../common/events/domain-event.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

export interface AutoAssignment {
  leadId: string;
  leadName: string;
  assignedUserId: string;
  assignedUserName: string;
  previousUserId: string | null;
}

/**
 * Round-robin distribution: a new unassigned lead goes to the eligible agent
 * who was auto-assigned least recently. Eligible = active, not deleted,
 * `receivesLeads`. The tenant's settings row is locked for the duration so
 * concurrent leads (imports, webhooks) never pick the same agent twice in a row.
 */
@Injectable()
export class LeadDistributionService implements OnModuleInit {
  private readonly logger = new Logger(LeadDistributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBus,
    private readonly leadActivityService: LeadActivityService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe(DOMAIN_EVENT_TYPES.LEAD_CREATED, (event) => {
      const created = event as LeadCreatedEvent;
      void this.autoAssignNewLead(created.tenantId, created.leadId).catch(
        (error: Error) =>
          this.logger.error(
            `Auto-assign failed for lead ${created.leadId}: ${error.message}`,
          ),
      );
    });
  }

  /** Assigns a freshly created lead if the tenant has auto-assign on. */
  async autoAssignNewLead(
    tenantId: string,
    leadId: string,
  ): Promise<AutoAssignment | null> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { autoAssignEnabled: true },
    });

    if (!settings?.autoAssignEnabled) {
      return null;
    }

    const assignment = await this.prisma.$transaction((tx) =>
      this.assignNext(tx, tenantId, leadId, { onlyIfUnassigned: true }),
    );

    if (assignment) {
      this.afterAssign(tenantId, assignment);
    }

    return assignment;
  }

  /**
   * Picks the next agent (optionally skipping the current owner) and assigns
   * the lead inside `tx`. Returns null when nobody is eligible or, with
   * `onlyIfUnassigned`, when someone assigned the lead in the meantime.
   */
  async assignNext(
    tx: Prisma.TransactionClient,
    tenantId: string,
    leadId: string,
    options: {
      onlyIfUnassigned?: boolean;
      excludeUserId?: string;
      reason?: string;
    },
  ): Promise<AutoAssignment | null> {
    // Serialize distribution per tenant.
    await tx.$queryRaw`SELECT "tenantId" FROM "TenantSettings" WHERE "tenantId" = ${tenantId}::uuid FOR UPDATE`;

    const lead = await tx.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        status: LeadStatus.OPEN,
        ...(options.onlyIfUnassigned ? { assignedUserId: null } : {}),
      },
      select: { id: true, fullName: true, assignedUserId: true },
    });

    if (!lead) {
      return null;
    }

    const next = await tx.user.findFirst({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        receivesLeads: true,
        ...(options.excludeUserId
          ? { id: { not: options.excludeUserId } }
          : {}),
      },
      orderBy: [
        { lastAutoAssignedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      select: { id: true, name: true },
    });

    if (!next) {
      return null;
    }

    const now = new Date();
    const updated = await tx.lead.updateMany({
      where: {
        id: lead.id,
        ...(options.onlyIfUnassigned ? { assignedUserId: null } : {}),
      },
      data: { assignedUserId: next.id, assignedAt: now, slaBreachedAt: null },
    });

    if (updated.count === 0) {
      return null;
    }

    await tx.user.update({
      where: { id: next.id },
      data: { lastAutoAssignedAt: now },
    });

    await this.leadActivityService.createActivity(
      {
        tenantId,
        leadId: lead.id,
        actorUserId: null,
        eventType: lead.assignedUserId
          ? LeadActivityEventType.REASSIGNED
          : LeadActivityEventType.ASSIGNED,
        metadata: {
          automatic: true,
          reason: options.reason ?? 'round_robin',
          ...(lead.assignedUserId ? { fromUserId: lead.assignedUserId } : {}),
          ...(lead.assignedUserId
            ? { toUserId: next.id, toUserName: next.name }
            : { assignedUserId: next.id, assignedUserName: next.name }),
        },
      },
      tx,
    );

    return {
      leadId: lead.id,
      leadName: lead.fullName,
      assignedUserId: next.id,
      assignedUserName: next.name,
      previousUserId: lead.assignedUserId,
    };
  }

  /** After commit: notify the new owner and refresh lead views. */
  afterAssign(tenantId: string, assignment: AutoAssignment): void {
    void this.eventBus.publish(
      new LeadAssignedEvent(tenantId, assignment.leadId),
    );
    void this.notificationTrigger.notifyLeadAssigned({
      tenantId,
      recipientUserId: assignment.assignedUserId,
      leadId: assignment.leadId,
      leadName: assignment.leadName,
      actorUserId: null,
    });
  }
}
