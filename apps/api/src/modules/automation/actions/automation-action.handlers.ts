import { Injectable } from '@nestjs/common';
import {
  AutomationActionType,
  LeadActivityEventType,
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import {
  AutomationActionContext,
  AutomationActionHandler,
  AutomationActionResult,
} from '../entities/automation-action-handler.types';

@Injectable()
export class CreateNotificationActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.CREATE_NOTIFICATION;

  constructor(
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.isTest) {
      return { success: true, message: 'Notification would be created' };
    }

    const recipientUserId = String(context.configuration.recipientUserId);
    const title = String(context.configuration.title);
    const message = String(context.configuration.message);
    const type =
      (context.configuration.type as NotificationType | undefined) ??
      NotificationType.SYSTEM;
    const priority =
      (context.configuration.priority as NotificationPriority | undefined) ??
      NotificationPriority.NORMAL;

    await this.notificationTrigger.trigger({
      tenantId: context.tenantId,
      recipientUserId,
      type,
      metadata: {
        title,
        message,
        workflowId: context.workflowId,
        entityType: context.entityType,
        entityId: context.entityId,
        ...(context.configuration.metadata as Record<string, unknown> | undefined),
      },
      priority,
      createdByUserId: context.actorUserId ?? null,
    });

    return { success: true };
  }
}

@Injectable()
export class AssignAgentActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.ASSIGN_AGENT;

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.entityType !== 'lead') {
      return { success: false, message: 'ASSIGN_AGENT requires a lead entity' };
    }

    if (context.isTest) {
      return { success: true, message: 'Lead would be assigned' };
    }

    const userId = String(context.configuration.userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: context.entityId },
        data: { assignedUserId: userId },
      });

      await this.leadActivityService.createActivity(
        {
          tenantId: context.tenantId,
          leadId: context.entityId,
          actorUserId: context.actorUserId ?? null,
          eventType: LeadActivityEventType.ASSIGNED,
          metadata: {
            assignedUserId: userId,
            source: 'automation',
            workflowId: context.workflowId,
          },
        },
        tx,
      );
    });

    return { success: true };
  }
}

@Injectable()
export class MoveStageActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.MOVE_STAGE;

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.entityType !== 'lead') {
      return { success: false, message: 'MOVE_STAGE requires a lead entity' };
    }

    if (context.isTest) {
      return { success: true, message: 'Lead stage would be moved' };
    }

    const pipelineStageId = String(context.configuration.pipelineStageId);
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: context.entityId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      select: {
        pipelineStageId: true,
        pipelineStage: { select: { name: true } },
      },
    });

    if (!lead) {
      return { success: false, message: 'Lead not found' };
    }

    const targetStage = await this.prisma.pipelineStage.findFirst({
      where: { id: pipelineStageId, tenantId: context.tenantId },
      select: { id: true, name: true },
    });

    if (!targetStage) {
      return { success: false, message: 'Target stage not found' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: context.entityId },
        data: { pipelineStageId: targetStage.id },
      });

      await this.leadActivityService.createActivity(
        {
          tenantId: context.tenantId,
          leadId: context.entityId,
          actorUserId: context.actorUserId ?? null,
          eventType: LeadActivityEventType.STAGE_CHANGED,
          metadata: {
            fromStageId: lead.pipelineStageId,
            fromStageName: lead.pipelineStage.name,
            toStageId: targetStage.id,
            toStageName: targetStage.name,
            source: 'automation',
            workflowId: context.workflowId,
          },
        },
        tx,
      );
    });

    return { success: true };
  }
}

@Injectable()
export class CreateNoteActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.CREATE_NOTE;

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.entityType !== 'lead') {
      return { success: false, message: 'CREATE_NOTE requires a lead entity' };
    }

    if (context.isTest) {
      return { success: true, message: 'Note would be created' };
    }

    const authorId =
      (context.configuration.authorId as string | undefined) ??
      context.actorUserId;

    if (!authorId) {
      return { success: false, message: 'authorId is required for CREATE_NOTE' };
    }

    await this.prisma.leadNote.create({
      data: {
        tenantId: context.tenantId,
        leadId: context.entityId,
        authorId,
        content: String(context.configuration.content),
      },
    });

    return { success: true };
  }
}

@Injectable()
export class CreateActivityActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.CREATE_ACTIVITY;

  constructor(private readonly leadActivityService: LeadActivityService) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.entityType !== 'lead') {
      return {
        success: false,
        message: 'CREATE_ACTIVITY requires a lead entity',
      };
    }

    if (context.isTest) {
      return { success: true, message: 'Activity would be created' };
    }

    await this.leadActivityService.createActivity({
      tenantId: context.tenantId,
      leadId: context.entityId,
      actorUserId: context.actorUserId ?? null,
      eventType: context.configuration.eventType as LeadActivityEventType,
      metadata: {
        ...(context.configuration.metadata as Record<string, unknown> | undefined),
        source: 'automation',
        workflowId: context.workflowId,
      },
    });

    return { success: true };
  }
}

@Injectable()
export class DelayActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.DELAY;

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    const delayMs = Number(context.configuration.delayMs ?? 0);

    if (context.isTest) {
      return { success: true, message: `Would delay ${delayMs}ms` };
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return { success: true };
  }
}

@Injectable()
export class TagActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.ADD_TAG;

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.entityType !== 'lead') {
      return { success: false, message: 'Tag actions require a lead entity' };
    }

    const tag = String(context.configuration.tag);

    if (context.isTest) {
      return { success: true, message: `Would add tag ${tag}` };
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        id: context.entityId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      select: { customFields: true },
    });

    if (!lead) {
      return { success: false, message: 'Lead not found' };
    }

    const customFields = (lead.customFields as Record<string, unknown> | null) ?? {};
    const tags = Array.isArray(customFields.tags)
      ? [...(customFields.tags as string[])]
      : [];

    const nextTags = tags.includes(tag) ? tags : [...tags, tag];

    await this.prisma.lead.update({
      where: { id: context.entityId },
      data: {
        customFields: {
          ...customFields,
          tags: nextTags,
        },
      },
    });

    return { success: true };
  }
}

@Injectable()
export class RemoveTagActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.REMOVE_TAG;

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    if (context.entityType !== 'lead') {
      return { success: false, message: 'Tag actions require a lead entity' };
    }

    const tag = String(context.configuration.tag);

    if (context.isTest) {
      return { success: true, message: `Would remove tag ${tag}` };
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        id: context.entityId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      select: { customFields: true },
    });

    if (!lead) {
      return { success: false, message: 'Lead not found' };
    }

    const customFields = (lead.customFields as Record<string, unknown> | null) ?? {};
    const tags = Array.isArray(customFields.tags)
      ? (customFields.tags as string[]).filter((item) => item !== tag)
      : [];

    await this.prisma.lead.update({
      where: { id: context.entityId },
      data: {
        customFields: {
          ...customFields,
          tags,
        },
      },
    });

    return { success: true };
  }
}

@Injectable()
export class UnsupportedActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.WEBHOOK;

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    return {
      success: false,
      skipped: true,
      message: `Action ${context.configuration._requestedType ?? 'unsupported'} is not implemented in Phase 1`,
    };
  }
}
