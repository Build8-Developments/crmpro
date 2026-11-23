import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadActivityEventType, LeadStatus, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AssignLeadDto } from '../dto/assign-lead.dto';
import { leadSelect, toLeadResponse } from '../lead.mapper';
import { LeadWorkflowResult } from '../types/lead.types';
import { LeadActivityService } from './lead-activity.service';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { LeadAssignedEvent } from '../../../common/events/domain-event.types';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { TaskLifecycleService } from '../../workflow/common/task-lifecycle.service';
import { type LeadScope, leadScopeWhere } from '../../../common/auth';

const workflowLeadSelect = {
  id: true,
  tenantId: true,
  status: true,
  assignedUserId: true,
  assignedUser: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.LeadSelect;

type WorkflowLeadRecord = Prisma.LeadGetPayload<{
  select: typeof workflowLeadSelect;
}>;

@Injectable()
export class LeadAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
    private readonly domainEventBus: DomainEventBus,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly taskLifecycle: TaskLifecycleService,
  ) {}

  async assignLead(
    leadId: string,
    tenantId: string,
    actorUserId: string,
    dto: AssignLeadDto,
    scope: LeadScope,
  ): Promise<LeadWorkflowResult> {
    const lead = await this.getWorkflowLeadOrThrow(leadId, tenantId, scope);
    this.ensureLeadIsOpen(lead.status);

    const previousUserId = lead.assignedUserId;
    const newUserId = dto.userId;

    if (previousUserId === newUserId) {
      throw new BadRequestException(
        newUserId === null
          ? 'Lead is already unassigned'
          : 'Lead is already assigned to this user',
      );
    }

    let newUser: { id: string; name: string } | null = null;

    if (newUserId !== null) {
      newUser = await this.validateAssignee(newUserId, tenantId);
    }

    const { eventType, metadata } = this.resolveAssignmentEvent(
      lead.assignedUser,
      newUser,
    );

    const activity = await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        // assignedAt starts the new owner's first-contact SLA clock.
        data: {
          assignedUserId: newUserId,
          assignedAt: newUserId ? new Date() : null,
        },
      });

      // The open next steps follow the lead to its new owner.
      const movedTaskCount = await this.taskLifecycle.followReassignment(
        lead.id,
        previousUserId,
        newUserId,
        tx,
      );

      return this.leadActivityService.createActivity(
        {
          tenantId,
          leadId: lead.id,
          actorUserId,
          eventType,
          metadata: {
            ...(metadata as Record<string, unknown>),
            movedTaskCount,
          },
        },
        tx,
      );
    });

    const updatedLead = await this.prisma.lead.findFirst({
      where: { id: lead.id, tenantId, deletedAt: null },
      select: leadSelect,
    });

    if (!updatedLead) {
      throw new NotFoundException('Lead not found');
    }

    void this.domainEventBus.publish(new LeadAssignedEvent(tenantId, leadId));

    if (newUserId !== null) {
      void this.notificationTrigger.notifyLeadAssigned({
        tenantId,
        recipientUserId: newUserId,
        leadId: lead.id,
        leadName: updatedLead.fullName,
        actorUserId,
      });
    }

    return {
      lead: toLeadResponse(updatedLead),
      activity,
    };
  }

  private resolveAssignmentEvent(
    previousUser: { id: string; name: string } | null,
    newUser: { id: string; name: string } | null,
  ): {
    eventType: LeadActivityEventType;
    metadata: Prisma.InputJsonValue;
  } {
    if (previousUser === null && newUser !== null) {
      return {
        eventType: LeadActivityEventType.ASSIGNED,
        metadata: {
          assignedUserId: newUser.id,
          assignedUserName: newUser.name,
        },
      };
    }

    if (previousUser !== null && newUser !== null) {
      return {
        eventType: LeadActivityEventType.REASSIGNED,
        metadata: {
          fromUserId: previousUser.id,
          toUserId: newUser.id,
          fromUserName: previousUser.name,
          toUserName: newUser.name,
        },
      };
    }

    if (previousUser !== null && newUser === null) {
      return {
        eventType: LeadActivityEventType.UNASSIGNED,
        metadata: {
          previousUserId: previousUser.id,
          previousUserName: previousUser.name,
        },
      };
    }

    throw new BadRequestException('Invalid assignment transition');
  }

  private async validateAssignee(
    userId: string,
    tenantId: string,
  ): Promise<{ id: string; name: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new BadRequestException('Assigned user not found');
    }

    return user;
  }

  private async getWorkflowLeadOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<WorkflowLeadRecord> {
    // Out of scope behaves exactly like missing.
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: workflowLeadSelect,
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  private ensureLeadIsOpen(status: LeadStatus): void {
    if (status === LeadStatus.ARCHIVED) {
      throw new BadRequestException('Archived leads cannot be assigned');
    }
  }
}
