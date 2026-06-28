import { Injectable } from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';

@Injectable()
export class TaskNotificationService {
  constructor(
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  async notifyAssigned(params: {
    tenantId: string;
    recipientUserId: string;
    taskId: string;
    taskTitle: string;
    actorUserId: string;
  }): Promise<void> {
    await this.notificationTrigger.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.TASK_ASSIGNED,
      createdByUserId: params.actorUserId,
      metadata: {
        taskId: params.taskId,
        title: 'Task Assigned',
        message: `You have been assigned: ${params.taskTitle}`,
        taskTitle: params.taskTitle,
      },
      priority: NotificationPriority.HIGH,
    });
  }

  async notifyDue(params: {
    tenantId: string;
    recipientUserId: string;
    taskId: string;
    taskTitle: string;
    dueLabel: string;
  }): Promise<void> {
    await this.notificationTrigger.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.TASK_DUE,
      metadata: {
        taskId: params.taskId,
        title: 'Task Due',
        message: `${params.taskTitle} is ${params.dueLabel}`,
        taskTitle: params.taskTitle,
      },
      priority: NotificationPriority.NORMAL,
    });
  }

  async notifyOverdue(params: {
    tenantId: string;
    recipientUserId: string;
    taskId: string;
    taskTitle: string;
  }): Promise<void> {
    await this.notificationTrigger.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.TASK_OVERDUE,
      metadata: {
        taskId: params.taskId,
        title: 'Task Overdue',
        message: `${params.taskTitle} is overdue`,
        taskTitle: params.taskTitle,
      },
      priority: NotificationPriority.HIGH,
    });
  }

  async notifyCompleted(params: {
    tenantId: string;
    recipientUserId: string;
    taskId: string;
    taskTitle: string;
    actorUserId?: string | null;
  }): Promise<void> {
    await this.notificationTrigger.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.TASK_COMPLETED,
      createdByUserId: params.actorUserId ?? null,
      metadata: {
        taskId: params.taskId,
        title: 'Task Completed',
        message: `${params.taskTitle} has been completed`,
        taskTitle: params.taskTitle,
      },
    });
  }
}
