import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType, TaskStatus, TenantStatus } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../../notifications/utils/notification-dedupe.util';
import { SchedulerService } from '../../scheduler/scheduler.service';
import {
  TASK_DUE_SOON_MINUTES,
  TASK_OVERDUE_LOOKBACK_HOURS,
  TASK_REMINDERS_EVERY_MS,
  TASK_REMINDERS_JOB,
  TASK_REMINDER_BATCH_SIZE,
} from './rule-keys';

type ReminderKind = 'due' | 'overdue';

/**
 * Every minute: a "due soon" notice shortly before a task and one "overdue"
 * notice after it passes. Each task is claimed with a conditional update, so
 * concurrent scans (several instances, retries) notify exactly once.
 * Rescheduling a task clears both stamps (see TasksService.update).
 */
@Injectable()
export class TaskRemindersService implements OnModuleInit {
  private readonly logger = new Logger(TaskRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerService,
    private readonly notifications: NotificationTriggerService,
  ) {}

  onModuleInit(): void {
    this.scheduler.register({
      name: TASK_REMINDERS_JOB,
      everyMs: TASK_REMINDERS_EVERY_MS,
      run: async () => {
        await this.runScan();
      },
    });
  }

  async runScan(now = new Date()): Promise<{ due: number; overdue: number }> {
    const due = await this.processBatch('due', now);
    const overdue = await this.processBatch('overdue', now);
    if (due + overdue > 0) {
      this.logger.log(`Task reminders sent: ${due} due, ${overdue} overdue`);
    }
    return { due, overdue };
  }

  private async processBatch(kind: ReminderKind, now: Date): Promise<number> {
    const dueSoonUntil = new Date(
      now.getTime() + TASK_DUE_SOON_MINUTES * 60_000,
    );
    const overdueSince = new Date(
      now.getTime() - TASK_OVERDUE_LOOKBACK_HOURS * 3_600_000,
    );

    const candidates = await this.prisma.task.findMany({
      where: {
        status: TaskStatus.OPEN,
        tenant: {
          deletedAt: null,
          status: { in: [TenantStatus.ACTIVE, TenantStatus.TRIAL] },
        },
        ...(kind === 'due'
          ? { reminderSentAt: null, dueAt: { gte: now, lte: dueSoonUntil } }
          : { overdueNotifiedAt: null, dueAt: { lt: now, gte: overdueSince } }),
      },
      orderBy: { dueAt: 'asc' },
      take: TASK_REMINDER_BATCH_SIZE,
      select: {
        id: true,
        tenantId: true,
        title: true,
        dueAt: true,
        assigneeId: true,
        lead: { select: { id: true, fullName: true } },
      },
    });

    let sent = 0;
    for (const task of candidates) {
      const claimed = await this.prisma.task.updateMany({
        where:
          kind === 'due'
            ? { id: task.id, reminderSentAt: null }
            : { id: task.id, overdueNotifiedAt: null },
        data:
          kind === 'due' ? { reminderSentAt: now } : { overdueNotifiedAt: now },
      });
      if (claimed.count === 0) continue;

      const type =
        kind === 'due'
          ? NotificationType.TASK_DUE
          : NotificationType.TASK_OVERDUE;
      await this.notifications.trigger({
        tenantId: task.tenantId,
        recipientUserId: task.assigneeId,
        type,
        metadata: {
          taskId: task.id,
          taskTitle: task.title,
          dueAt: task.dueAt.toISOString(),
          leadId: task.lead?.id ?? null,
          leadName: task.lead?.fullName ?? null,
        },
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'task',
          entityId: task.id,
          type,
          recipientUserId: task.assigneeId,
          // A new due time is a new reminder.
          suffix: task.dueAt.toISOString(),
        }),
      });
      sent += 1;
    }
    return sent;
  }
}
