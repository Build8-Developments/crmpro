import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadActivityEventType, LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AssignLeadDto } from '../dto/assign-lead.dto';
import { leadSelect, toLeadResponse } from '../lead.mapper';
import { LeadWorkflowResult } from '../types/lead.types';
import { LeadActivityService } from './lead-activity.service';

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
  ) {}

  async assignLead(
    leadId: string,
    tenantId: string,
    actorUserId: string,
    dto: AssignLeadDto,
  ): Promise<LeadWorkflowResult> {
    const lead = await this.getWorkflowLeadOrThrow(leadId, tenantId);
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
  ): Promise<WorkflowLeadRecord> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null },
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
