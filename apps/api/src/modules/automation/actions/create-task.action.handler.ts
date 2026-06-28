import { Injectable } from '@nestjs/common';
import {
  AutomationActionType,
  TaskPriority,
  TaskType,
} from '@prisma/client';
import { TasksService } from '../../tasks/tasks.service';
import {
  AutomationActionContext,
  AutomationActionHandler,
  AutomationActionResult,
} from '../entities/automation-action-handler.types';

@Injectable()
export class CreateTaskActionHandler implements AutomationActionHandler {
  readonly actionType = AutomationActionType.CREATE_TASK;

  constructor(private readonly tasksService: TasksService) {}

  async execute(
    context: AutomationActionContext,
  ): Promise<AutomationActionResult> {
    const title = String(context.configuration.title ?? 'Automated Task');

    if (context.isTest) {
      return { success: true, message: `Would create task: ${title}` };
    }

    const leadId =
      context.entityType === 'lead'
        ? context.entityId
        : (context.configuration.leadId as string | undefined) ?? null;

    const assignedUserId =
      (context.configuration.assignedUserId as string | undefined) ??
      (context.entityData.assignedUserId as string | undefined) ??
      null;

    await this.tasksService.createTaskFromAutomation({
      tenantId: context.tenantId,
      createdByUserId: context.actorUserId ?? context.configuration.createdByUserId as string,
      leadId,
      projectId: (context.configuration.projectId as string | undefined) ?? null,
      assignedUserId,
      title,
      description: (context.configuration.description as string | undefined) ?? null,
      type: (context.configuration.type as TaskType | undefined) ?? TaskType.FOLLOW_UP,
      priority:
        (context.configuration.priority as TaskPriority | undefined) ??
        TaskPriority.MEDIUM,
      dueAt: context.configuration.dueAt
        ? new Date(String(context.configuration.dueAt))
        : null,
      reminderAt: context.configuration.reminderAt
        ? new Date(String(context.configuration.reminderAt))
        : null,
      metadata: {
        workflowId: context.workflowId,
        source: 'automation',
      },
    });

    return { success: true };
  }
}
