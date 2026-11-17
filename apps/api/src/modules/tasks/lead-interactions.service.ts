import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '@crmpro/database';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { LeadActivityLoggedEvent } from '../../common/events/domain-event.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  leadScopeWhere,
  type LeadScope,
} from '../leads/scope/lead-scope.types';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { LogLeadActivityDto } from './dto/log-lead-activity.dto';
import { INTERACTION_EVENT_TYPES } from './tasks.constants';
import { TasksService } from './tasks.service';

/** Small allowance for client clock drift on "occurredAt". */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

@Injectable()
export class LeadInteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
    private readonly tasksService: TasksService,
    private readonly domainEventBus: DomainEventBus,
  ) {}

  /**
   * Logs a call / WhatsApp / email / meeting / site visit. Every logged
   * attempt counts as contact: it moves `lastContactedAt`, sets
   * `firstContactedAt` once (speed-to-lead) and can schedule the next
   * follow-up in the same transaction.
   */
  async logActivity(
    leadId: string,
    tenantId: string,
    actorUserId: string,
    dto: LogLeadActivityDto,
    scope: LeadScope,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: {
        id: true,
        status: true,
        assignedUserId: true,
        lastContactedAt: true,
        firstContactedAt: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status === LeadStatus.ARCHIVED) {
      throw new BadRequestException('Archived leads cannot be modified');
    }

    const now = Date.now();
    const occurredAt = dto.occurredAt ?? new Date(now);

    if (occurredAt.getTime() > now + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException('occurredAt cannot be in the future');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const activity = await this.leadActivityService.createActivity(
        {
          tenantId,
          leadId: lead.id,
          actorUserId,
          eventType: INTERACTION_EVENT_TYPES[dto.type],
          metadata: {
            channel: dto.type,
            occurredAt: occurredAt.toISOString(),
            ...(dto.outcome ? { outcome: dto.outcome } : {}),
            ...(dto.durationSeconds !== undefined
              ? { durationSeconds: dto.durationSeconds }
              : {}),
            ...(dto.note ? { note: dto.note } : {}),
          } satisfies Prisma.InputJsonValue,
        },
        tx,
      );

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          ...(!lead.lastContactedAt || lead.lastContactedAt < occurredAt
            ? { lastContactedAt: occurredAt }
            : {}),
          ...(!lead.firstContactedAt || lead.firstContactedAt > occurredAt
            ? { firstContactedAt: occurredAt }
            : {}),
        },
      });

      const nextTaskId = dto.nextFollowUp
        ? await this.tasksService.insertTask(tx, {
            tenantId,
            actorUserId,
            leadId: lead.id,
            // The lead owner follows up; unassigned leads fall to the actor.
            assignedUserId: lead.assignedUserId ?? actorUserId,
            title: dto.nextFollowUp.title,
            type: dto.nextFollowUp.type,
            dueAt: dto.nextFollowUp.dueAt,
          })
        : null;

      return { activity, nextTaskId };
    });

    void this.domainEventBus.publish(
      new LeadActivityLoggedEvent(tenantId, lead.id),
    );

    if (result.nextTaskId) {
      this.tasksService.afterChange(tenantId, result.nextTaskId, lead.id);
    }

    return {
      activity: result.activity,
      nextTask: result.nextTaskId
        ? await this.tasksService.getTask(result.nextTaskId, tenantId, {
            kind: 'all',
            actorUserId: null,
          })
        : null,
    };
  }
}
