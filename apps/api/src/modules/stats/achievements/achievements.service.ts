import { Injectable, Logger } from '@nestjs/common';
import { DealStatus, NotificationType, Prisma } from '@crmpro/database';
import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementReading,
} from '@crmpro/shared/achievements';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../../notifications/utils/notification-dedupe.util';
import { TenantClockService } from '../../workflow/common/tenant-clock.service';
import { dayToDbDate, dbDateToDay, localDayOf } from '../utils/local-day.util';
import {
  type AchievementCalendar,
  type AchievementInputs,
  buildTimelines,
} from './achievement-sources';
import { type BadgeEvaluation, evaluateBadge } from './achievement-timeline';
import {
  ACHIEVEMENT_NOTIFICATION_WINDOW_MS,
  PERFORMANCE_HREF,
} from './achievements.constants';

const DEFAULT_WEEK_STARTS_ON = 6;

export interface UnlockedLevelRecord {
  value: number;
  unlockedAt: Date;
}

/** One badge for one user after an evaluation. */
export interface BadgeState {
  definition: AchievementDefinition;
  reading: AchievementReading;
  /** Stored levels (including the ones written by this evaluation). */
  unlocked: Map<number, UnlockedLevelRecord>;
}

export interface EvaluationResult {
  badges: BadgeState[];
  /** Level rows written by this evaluation. */
  written: number;
  /** Notifications sent (at most one per badge). */
  notified: number;
}

/**
 * Badges (spec §4.1, §2.9): computes every catalog metric for a user, stores a
 * `UserAchievement` row for each newly reached level (never deletes one) and
 * notifies once per badge, for the highest new level.
 *
 * No flood on first run: a level that was already reached 48 hours ago (old
 * history, e.g. an agent who already had 30 deals when badges shipped) is
 * stored silently with the day it was really reached.
 */
@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantClockService,
    private readonly notifications: NotificationTriggerService,
  ) {}

  async loadCalendar(tenantId: string): Promise<AchievementCalendar> {
    const [settings, tenantSettings] = await Promise.all([
      this.clock.getWorkflowSettings(tenantId),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { weekStartsOn: true },
      }),
    ]);
    return {
      timeZone: settings.schedule.timeZone,
      weekStartsOn: tenantSettings?.weekStartsOn ?? DEFAULT_WEEK_STARTS_ON,
      schedule: settings.schedule,
      dailyInteractionGoal: settings.dailyInteractionGoal,
    };
  }

  /** The user's deals, leads and daily rows (three queries). */
  async loadInputs(
    tenantId: string,
    userId: string,
    calendar: AchievementCalendar,
  ): Promise<AchievementInputs> {
    const [deals, leads, days] = await Promise.all([
      this.prisma.deal.findMany({
        where: {
          tenantId,
          agentId: userId,
          status: { not: DealStatus.CANCELLED },
          lead: { deletedAt: null },
        },
        select: {
          reservedAt: true,
          contractedAt: true,
          price: true,
          commissionAmount: true,
          lead: { select: { source: { select: { name: true } } } },
        },
      }),
      this.prisma.lead.findMany({
        where: { tenantId, assignedUserId: userId, deletedAt: null },
        select: {
          assignedAt: true,
          firstContactedAt: true,
          closedAt: true,
          pipelineStage: { select: { closeType: true } },
        },
      }),
      this.prisma.userDailyStat.findMany({
        where: { tenantId, userId },
        select: {
          day: true,
          tasksDue: true,
          tasksDone: true,
          tasksOverdue: true,
          interactions: true,
        },
        orderBy: { day: 'asc' },
      }),
    ]);

    return {
      deals: deals.map((deal) => ({
        reservedAt: deal.reservedAt,
        contractedAt: deal.contractedAt,
        price: deal.price.toNumber(),
        commission: deal.commissionAmount?.toNumber() ?? 0,
        sourceName: deal.lead.source?.name ?? null,
      })),
      leads: leads.map((lead) => ({
        assignedAt: lead.assignedAt,
        firstContactedAt: lead.firstContactedAt,
        closedAt: lead.closedAt,
        closeType: lead.closedAt
          ? (lead.pipelineStage.closeType ?? null)
          : null,
      })),
      days: days.map((row) => ({
        day: dbDateToDay(row.day),
        tasksDue: row.tasksDue,
        tasksDone: row.tasksDone,
        tasksOverdue: row.tasksOverdue,
        interactions: row.interactions,
      })),
      calendar,
    };
  }

  /**
   * Evaluate every badge for the user: write new levels, notify recent ones.
   * Writing and notifying are best effort — on failure the current readings
   * and the levels already stored are still returned.
   */
  async evaluate(
    tenantId: string,
    userId: string,
    inputs: AchievementInputs,
    now = new Date(),
  ): Promise<EvaluationResult> {
    const stored = await this.prisma.userAchievement.findMany({
      where: { tenantId, userId },
      select: { key: true, level: true, value: true, unlockedAt: true },
    });
    const unlockedByKey = new Map<string, Map<number, UnlockedLevelRecord>>();
    for (const row of stored) {
      const levels =
        unlockedByKey.get(row.key) ?? new Map<number, UnlockedLevelRecord>();
      levels.set(row.level, {
        value: row.value.toNumber(),
        unlockedAt: row.unlockedAt,
      });
      unlockedByKey.set(row.key, levels);
    }

    const today = localDayOf(now, inputs.calendar.timeZone);
    const timelines = buildTimelines(inputs, today, now);
    const evaluations: BadgeEvaluation[] = ACHIEVEMENTS.map((definition) =>
      evaluateBadge({
        definition,
        timeline: timelines[definition.key],
        unlockedLevels: new Set(
          unlockedByKey.get(definition.key)?.keys() ?? [],
        ),
        now,
        recentWindowMs: ACHIEVEMENT_NOTIFICATION_WINDOW_MS,
      }),
    );

    const rows: Prisma.UserAchievementCreateManyInput[] = evaluations.flatMap(
      (evaluation) =>
        evaluation.newLevels.map((level) => ({
          tenantId,
          userId,
          key: evaluation.definition.key,
          level: level.level,
          value: new Prisma.Decimal(level.value),
          unlockedAt: level.unlockedAt,
        })),
    );

    let written = 0;
    let notified = 0;
    if (rows.length > 0) {
      try {
        const result = await this.prisma.userAchievement.createMany({
          data: rows,
          skipDuplicates: true,
        });
        written = result.count;
        for (const evaluation of evaluations) {
          const levels =
            unlockedByKey.get(evaluation.definition.key) ??
            new Map<number, UnlockedLevelRecord>();
          for (const level of evaluation.newLevels) {
            levels.set(level.level, {
              value: level.value,
              unlockedAt: level.unlockedAt,
            });
          }
          unlockedByKey.set(evaluation.definition.key, levels);
        }
        // Fewer rows than sent: a concurrent evaluation (job tick vs. page
        // open) wrote them first and announces them. The dedupe key is the
        // second guard.
        if (written === rows.length) {
          for (const evaluation of evaluations) {
            if (await this.notify(tenantId, userId, evaluation)) notified += 1;
          }
        }
      } catch (error) {
        this.logger.warn(
          `Achievements write failed for user ${userId}: ${String(error)}`,
        );
      }
    }

    return {
      badges: evaluations.map((evaluation) => ({
        definition: evaluation.definition,
        reading: evaluation.reading,
        unlocked:
          unlockedByKey.get(evaluation.definition.key) ??
          new Map<number, UnlockedLevelRecord>(),
      })),
      written,
      notified,
    };
  }

  /** Load and evaluate one user; never throws. */
  async evaluateUser(
    tenantId: string,
    userId: string,
    now = new Date(),
    calendar?: AchievementCalendar,
  ): Promise<EvaluationResult | null> {
    try {
      const resolved = calendar ?? (await this.loadCalendar(tenantId));
      const inputs = await this.loadInputs(tenantId, userId, resolved);
      return await this.evaluate(tenantId, userId, inputs, now);
    } catch (error) {
      this.logger.warn(
        `Achievements evaluation failed for user ${userId}: ${String(error)}`,
      );
      return null;
    }
  }

  /**
   * For the daily-stats job: everyone active with a stats row today (they
   * did something, or something was due) — the only people whose badges can
   * have moved since the last tick. Never throws.
   */
  async evaluateActiveToday(
    tenantId: string,
    today: string,
    now = new Date(),
  ): Promise<{ users: number; written: number; notified: number }> {
    const summary = { users: 0, written: 0, notified: 0 };
    try {
      const rows = await this.prisma.userDailyStat.findMany({
        where: {
          tenantId,
          day: dayToDbDate(today),
          user: { isActive: true, deletedAt: null },
        },
        select: { userId: true },
      });
      if (rows.length === 0) return summary;
      const calendar = await this.loadCalendar(tenantId);
      for (const { userId } of rows) {
        const result = await this.evaluateUser(tenantId, userId, now, calendar);
        summary.users += 1;
        summary.written += result?.written ?? 0;
        summary.notified += result?.notified ?? 0;
      }
    } catch (error) {
      this.logger.warn(
        `Achievements pass failed for tenant ${tenantId}: ${String(error)}`,
      );
    }
    return summary;
  }

  private async notify(
    tenantId: string,
    userId: string,
    evaluation: BadgeEvaluation,
  ): Promise<boolean> {
    const level = evaluation.notifyLevel;
    if (!level) return false;
    const { definition } = evaluation;
    try {
      await this.notifications.trigger({
        tenantId,
        recipientUserId: userId,
        type: NotificationType.ACHIEVEMENT,
        metadata: {
          badgeKey: definition.key,
          badgeName: definition.name,
          level: level.level,
          levelLabel: level.label,
          href: PERFORMANCE_HREF,
        },
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'achievement',
          entityId: `${definition.key}-${level.level}`,
          type: NotificationType.ACHIEVEMENT,
          recipientUserId: userId,
        }),
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Achievement notification failed for user ${userId}: ${String(error)}`,
      );
      return false;
    }
  }
}
