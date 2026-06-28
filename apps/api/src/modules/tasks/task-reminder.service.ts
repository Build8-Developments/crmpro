import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { LoggingService } from '../../common/logging/logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationTriggerService } from '../automation/automation-trigger.service';
import { TaskJobPayload } from './entities/task.types';
import { TaskMetricsStore } from './metrics/task-metrics.store';
import { taskSelect } from './mappers/task.mapper';
import { TaskNotificationService } from './task-notification.service';
import { TaskQueueService } from './task-queue.service';

@Injectable()
export class TaskReminderService implements OnModuleInit {
  private readonly logger = new Logger(TaskReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: TaskNotificationService,
    private readonly queueService: TaskQueueService,
    private readonly automationTrigger: AutomationTriggerService,
    private readonly loggingService: LoggingService,
    private readonly metricsStore: TaskMetricsStore,
  ) {}

  onModuleInit(): void {
    // Repeatable overdue scan is registered by TaskReminderProcessor.
  }

  async processJob(payload: TaskJobPayload): Promise<void> {
    switch (payload.jobType) {
      case 'REMINDER':
        await this.processReminder(payload.taskId, payload.tenantId);
        break;
      case 'DUE_TODAY':
        await this.processDueToday(payload.taskId, payload.tenantId);
        break;
      case 'OVERDUE_SCAN':
        await this.scanOverdueTasks();
        break;
      default:
        this.logger.warn(`Unknown task job type: ${payload.jobType}`);
    }
  }

  private async processReminder(taskId: string, tenantId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId, deletedAt: null },
      select: taskSelect,
    });

    if (!task || !task.assignedUserId) {
      return;
    }

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.CANCELLED
    ) {
      return;
    }

    const metadata = task.metadata as Record<string, unknown>;
    if (metadata.reminderSent === true) {
      return;
    }

    await this.notificationService.notifyDue({
      tenantId,
      recipientUserId: task.assignedUserId,
      taskId: task.id,
      taskTitle: task.title,
      dueLabel: 'due soon',
    });

    await this.prisma.task.update({
      where: { id: task.id },
      data: {
        metadata: { ...metadata, reminderSent: true },
      },
    });

    this.metricsStore.recordReminderSent();
    this.loggingService.info({
      module: 'Tasks',
      operation: 'reminder',
      status: 'sent',
      metadata: { taskId: task.id, tenantId },
    });
  }

  private async processDueToday(taskId: string, tenantId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId, deletedAt: null },
      select: taskSelect,
    });

    if (!task?.assignedUserId) {
      return;
    }

    await this.notificationService.notifyDue({
      tenantId,
      recipientUserId: task.assignedUserId,
      taskId: task.id,
      taskTitle: task.title,
      dueLabel: 'due today',
    });
  }

  private async scanOverdueTasks(): Promise<void> {
    const now = new Date();

    const overdueCandidates = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        dueAt: { lt: now },
      },
      select: taskSelect,
      take: 200,
    });

    for (const task of overdueCandidates) {
      await this.prisma.task.update({
        where: { id: task.id },
        data: { status: TaskStatus.OVERDUE },
      });

      if (task.assignedUserId) {
        void this.notificationService.notifyOverdue({
          tenantId: task.tenantId,
          recipientUserId: task.assignedUserId,
          taskId: task.id,
          taskTitle: task.title,
        });
      }

      void this.automationTrigger.onTaskOverdue({
        tenantId: task.tenantId,
        taskId: task.id,
      });

      this.metricsStore.recordOverdue();
      this.loggingService.info({
        module: 'Tasks',
        operation: 'overdue',
        status: 'detected',
        metadata: { taskId: task.id, tenantId: task.tenantId },
      });
    }

    this.logger.debug(`Overdue scan processed ${overdueCandidates.length} task(s)`);
  }
}
