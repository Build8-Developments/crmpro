import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadActivityEventType, LeadStatus, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  isAssigneeInScope,
  leadScopeWhere,
  type LeadScope,
} from '../scope/lead-scope.types';
import { AssignLeadDto } from '../dto/assign-lead.dto';
import { leadSelect, toLeadResponse } from '../lead.mapper';
import { LeadWorkflowResult } from '../types/lead.types';
import { LeadActivityService } from './lead-activity.service';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { LeadAssignedEvent } from '../../../common/events/domain-event.types';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';

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
    this.ensureTargetInScope(scope, dto.userId);

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
        data: { assignedUserId: newUserId },
      });

      return this.leadActivityService.createActivity(
        {
          tenantId,
          leadId: lead.id,
          actorUserId,
          eventType,
          metadata,
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
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: workflowLeadSelect,
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  /**
   * Scoped actors may only hand leads to people they can see: managers inside
   * their team, own-scope actors only to themselves. Unassigning is reserved
   * for team/all scope (an own-scope unassign would just lose the lead).
   */
  private ensureTargetInScope(scope: LeadScope, targetUserId: string | null) {
    if (scope.kind === 'all') {
      return;
    }

    if (targetUserId === null) {
      if (scope.kind === 'team') {
        return;
      }

      throw new ForbiddenException('You cannot unassign this lead');
    }

    if (!isAssigneeInScope(scope, targetUserId)) {
      throw new ForbiddenException(
        'You can only assign leads to members of your team',
      );
    }
  }

  private ensureLeadIsOpen(status: LeadStatus): void {
    if (status === LeadStatus.ARCHIVED) {
      throw new BadRequestException('Archived leads cannot be assigned');
    }
  }
}
