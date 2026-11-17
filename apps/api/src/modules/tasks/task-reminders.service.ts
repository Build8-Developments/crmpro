import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType, TaskStatus } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantStatusService } from '../../common/tenant/tenant-status.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import { SchedulerService } from '../scheduler/scheduler.service';
import {
  TASK_DUE_SOON_MINUTES,
  TASK_OVERDUE_LOOKBACK_HOURS,
  TASK_REMINDER_BATCH_SIZE,
  TASK_REMINDER_JOB_NAME,
  TASK_REMINDER_SCAN_INTERVAL_MS,
} from './tasks.constants';

type ReminderKind = 'due' | 'overdue';

/**
 * Every minute: "due soon" notice shortly before a follow-up and one
 * "overdue" notice after it passes. Each task is claimed with a conditional
 * update, so concurrent scans (multiple instances, retries) notify once.
 */
@Injectable()
export class TaskRemindersService implements OnModuleInit {
  private readonly logger = new Logger(TaskRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: SchedulerService,
    private readonly tenantStatus: TenantStatusService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  onModuleInit(): void {
    this.scheduler.register({
      name: TASK_REMINDER_JOB_NAME,
      everyMs: TASK_REMINDER_SCAN_INTERVAL_MS,
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
        deletedAt: null,
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
        assignedUserId: true,
        lead: { select: { id: true, fullName: true } },
      },
    });

    let sent = 0;
    const tenantActive = new Map<string, boolean>();

    for (const task of candidates) {
      if (!tenantActive.has(task.tenantId)) {
        tenantActive.set(
          task.tenantId,
          await this.tenantStatus.isTenantActive(task.tenantId),
        );
      }

      if (!tenantActive.get(task.tenantId)) {
        continue;
      }

      const claimed = await this.prisma.task.updateMany({
        where:
          kind === 'due'
            ? { id: task.id, reminderSentAt: null }
            : { id: task.id, overdueNotifiedAt: null },
        data:
          kind === 'due' ? { reminderSentAt: now } : { overdueNotifiedAt: now },
      });

      if (claimed.count === 0) {
        continue;
      }

      const type =
        kind === 'due'
          ? NotificationType.TASK_DUE
          : NotificationType.TASK_OVERDUE;

      await this.notificationTrigger.trigger({
        tenantId: task.tenantId,
        recipientUserId: task.assignedUserId,
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
          recipientUserId: task.assignedUserId,
          // Rescheduling resets the claim columns; a new due time is a new reminder.
          suffix: task.dueAt.toISOString(),
        }),
      });
      sent += 1;
    }

    return sent;
  }
}
