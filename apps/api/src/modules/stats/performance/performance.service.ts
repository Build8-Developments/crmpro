import { Injectable, Logger } from '@nestjs/common';
import { TargetMetric } from '@crmpro/database';
import {
  FAST_FIRST_CONTACT_MINUTES,
  getAchievement,
  getAchievementLevel,
} from '@crmpro/shared/achievements';
import { PERMISSIONS } from '@crmpro/shared/auth';
import type { LeadScope } from '../../../common/auth';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  monthBounds,
  periodOf,
  periodRange,
  shiftPeriod,
} from '../../../common/utils/month-period.util';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import {
  TargetActualsService,
  VISIT_INTERACTION_WHERE,
} from '../../targets/target-actuals.service';
import { TargetsService } from '../../targets/targets.service';
import {
  type BadgeState,
  AchievementsService,
} from '../achievements/achievements.service';
import { badgeProgress } from '../achievements/achievement-timeline';
import { DailyStatsService } from '../daily-stats.service';
import type {
  BadgeView,
  LeaderboardView,
  MyPerformanceResponse,
  RecentWin,
  VisibleLeaderboardMode,
} from './performance.types';
import {
  bestMonth,
  effectiveLeaderboardMode,
  fastContactStreak,
  monthlySeries,
  mostVisitsInWeek,
  rankLeaderboard,
  targetAttainment,
} from './performance.utils';

const DEFAULT_CURRENCY = 'EGP';
/** "Recent wins": badges unlocked in the last two weeks, at most six. */
const RECENT_WINS_DAYS = 14;
const RECENT_WINS_LIMIT = 6;
const RECENT_WIN_NAMES = 3;
const SERIES_MONTHS = 12;

const FAST_CONTACT_RULE = `Consecutive newly assigned leads, in the order you got them, that you first contacted within ${FAST_FIRST_CONTACT_MINUTES} working minutes. A lead reached later, or still not reached after that, ends the run.`;

function toBadgeView(badge: BadgeState): BadgeView {
  const { definition, reading, unlocked } = badge;
  const progress = badgeProgress(definition, reading, new Set(unlocked.keys()));
  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    unit: definition.unit,
    unitLabel: definition.unitLabel,
    value: reading.value,
    sample: reading.sample,
    minSample: definition.minSample ?? null,
    sampleLabel: definition.sampleLabel ?? null,
    currentLevel: progress.currentLevel,
    levels: definition.levels.map((level) => ({
      level: level.level,
      threshold: level.threshold,
      label: level.label,
      unlockedAt: unlocked.get(level.level)?.unlockedAt.toISOString() ?? null,
    })),
    next: progress.next,
  };
}

/**
 * "My performance" (spec §4.1): the caller's all-time totals, month vs
 * target, last 12 months, personal bests, badges and — when visible — their
 * rank this month. Opening it also evaluates the caller's badges.
 */
@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly achievements: AchievementsService,
    private readonly dailyStats: DailyStatsService,
    private readonly targets: TargetsService,
    private readonly targetActuals: TargetActualsService,
  ) {}

  async getMyPerformance(
    user: AuthenticatedUser,
    scope: LeadScope,
    permissionKeys: ReadonlySet<string>,
    now = new Date(),
  ): Promise<MyPerformanceResponse> {
    const tenantId = user.tenantId;
    try {
      // Today's row feeds the streak badges.
      await this.dailyStats.refreshToday(tenantId, user.id, now);
    } catch (error) {
      this.logger.warn(
        `Today refresh failed for user ${user.id}: ${String(error)}`,
      );
    }

    const [calendar, settings, me] = await Promise.all([
      this.achievements.loadCalendar(tenantId),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { currency: true, leaderboardMode: true },
      }),
      this.prisma.user.findFirst({
        where: { id: user.id, tenantId },
        select: { createdAt: true },
      }),
    ]);
    const { timeZone } = calendar;
    const period = periodOf(now, timeZone);
    const inputs = await this.achievements.loadInputs(
      tenantId,
      user.id,
      calendar,
    );

    const touches = {
      tenantId,
      userId: user.id,
      lead: { deletedAt: null },
    } as const;
    const leaderboardMode = effectiveLeaderboardMode(
      settings?.leaderboardMode ?? 'TARGET_PERCENT',
      scope,
    );

    const [evaluation, interactions, visits, clients, month, rank, firstTouch] =
      await Promise.all([
        this.achievements.evaluate(tenantId, user.id, inputs, now),
        this.prisma.interaction.count({ where: touches }),
        this.prisma.interaction.findMany({
          where: { ...touches, ...VISIT_INTERACTION_WHERE },
          select: { occurredAt: true },
        }),
        this.prisma.interaction.groupBy({
          by: ['leadId'],
          where: touches,
        }),
        permissionKeys.has(PERMISSIONS.TARGET_READ)
          ? this.targets.getMine(user, new Set<string>(), period, now)
          : Promise.resolve(null),
        leaderboardMode
          ? this.leaderboard(
              tenantId,
              user.id,
              period,
              timeZone,
              leaderboardMode,
              now,
            )
          : Promise.resolve(null),
        this.prisma.interaction.aggregate({
          where: touches,
          _min: { occurredAt: true },
        }),
      ]);

    const { deals } = inputs;
    const contracted = deals.filter((deal) => deal.contractedAt !== null);
    const sum = (values: number[]) =>
      Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
    const streak = fastContactStreak(inputs.leads, calendar.schedule, now);

    return {
      timeZone,
      currency: settings?.currency ?? DEFAULT_CURRENCY,
      period,
      allTime: {
        deals: deals.length,
        units: deals.length,
        revenue: sum(contracted.map((deal) => deal.price)),
        commission: sum(contracted.map((deal) => deal.commission)),
        interactions,
        visits: visits.length,
        clientsServed: clients.length,
        since: earliest(
          [
            me?.createdAt,
            firstTouch._min.occurredAt,
            ...deals.map((deal) => deal.reservedAt),
          ],
          now,
        ).toISOString(),
      },
      month,
      months: monthlySeries(
        deals,
        periodRange(shiftPeriod(period, -(SERIES_MONTHS - 1)), period),
        timeZone,
      ),
      bests: {
        bestRevenueMonth: bestMonth(deals, 'revenue', timeZone),
        bestDealsMonth: bestMonth(deals, 'deals', timeZone),
        fastContactStreak: {
          ...streak,
          minutes: FAST_FIRST_CONTACT_MINUTES,
          rule: FAST_CONTACT_RULE,
        },
        mostVisitsWeek: mostVisitsInWeek(
          visits.map((visit) => visit.occurredAt),
          timeZone,
          calendar.weekStartsOn,
        ),
      },
      badges: evaluation.badges.map(toBadgeView),
      rank,
    };
  }

  /**
   * This month among active people who can record deals (deal.write),
   * ranked and trimmed by `mode` (see rankLeaderboard): other people's money
   * is only sent in FULL. Plus the latest badges people unlocked.
   */
  private async leaderboard(
    tenantId: string,
    meId: string,
    period: string,
    timeZone: string,
    mode: VisibleLeaderboardMode,
    now: Date,
  ): Promise<LeaderboardView> {
    const people = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        role: {
          permissions: {
            some: { permission: { key: PERMISSIONS.DEAL_WRITE } },
          },
        },
      },
      select: { id: true, name: true, showOnLeaderboard: true },
    });
    const [actuals, targets, recentWins] = await Promise.all([
      this.targetActuals.compute(tenantId, monthBounds(period, timeZone)),
      this.prisma.target.findMany({
        where: {
          tenantId,
          period,
          userId: { in: people.map((person) => person.id) },
        },
        select: { userId: true, metric: true, value: true },
      }),
      this.recentWins(tenantId, meId, mode, now),
    ]);

    const targetsByUser = new Map<
      string,
      Array<{ metric: TargetMetric; value: number }>
    >();
    for (const target of targets) {
      if (!target.userId) continue;
      const list = targetsByUser.get(target.userId) ?? [];
      list.push({ metric: target.metric, value: Number(target.value) });
      targetsByUser.set(target.userId, list);
    }

    const ranked = rankLeaderboard(
      people.map((person) => {
        const values = actuals.byUser.get(person.id);
        return {
          userId: person.id,
          name: person.name,
          showOnLeaderboard: person.showOnLeaderboard,
          revenue: values?.[TargetMetric.REVENUE] ?? 0,
          deals: values?.[TargetMetric.DEALS] ?? 0,
          targetPercent: targetAttainment(
            targetsByUser.get(person.id) ?? [],
            values,
          ),
        };
      }),
      meId,
      mode,
    );
    return { period, mode, ...ranked, recentWins };
  }

  /**
   * Badge levels unlocked in the last RECENT_WINS_DAYS by people who show
   * their name. Money badges would reveal revenue, so they only appear when
   * the workspace shows full figures.
   */
  private async recentWins(
    tenantId: string,
    meId: string,
    mode: VisibleLeaderboardMode,
    now: Date,
  ): Promise<RecentWin[]> {
    const rows = await this.prisma.userAchievement.findMany({
      where: {
        tenantId,
        unlockedAt: {
          gte: new Date(now.getTime() - RECENT_WINS_DAYS * 86_400_000),
          lte: now,
        },
        user: { isActive: true, deletedAt: null, showOnLeaderboard: true },
      },
      orderBy: { unlockedAt: 'desc' },
      take: 200,
      select: {
        key: true,
        level: true,
        unlockedAt: true,
        user: { select: { id: true, name: true } },
      },
    });
    const groups = new Map<string, RecentWin>();
    for (const row of rows) {
      const badge = getAchievement(row.key);
      const level = getAchievementLevel(row.key, row.level);
      if (!badge || !level) continue;
      if (badge.unit === 'money' && mode !== 'FULL') continue;
      const groupKey = `${row.key}:${row.level}`;
      let group = groups.get(groupKey);
      if (!group) {
        if (groups.size === RECENT_WINS_LIMIT) continue;
        group = {
          badgeName: badge.name,
          levelLabel: level.label,
          unlockedAt: row.unlockedAt.toISOString(),
          people: [],
          others: 0,
        };
        groups.set(groupKey, group);
      }
      if (group.people.length < RECENT_WIN_NAMES) {
        group.people.push({
          userId: row.user.id,
          name: row.user.name,
          isMe: row.user.id === meId,
        });
      } else {
        group.others += 1;
      }
    }
    return [...groups.values()];
  }
}

/**
 * Where "all time" starts: the account's creation, or earlier when the
 * history is older (imported or re-seeded data, a re-created account).
 */
function earliest(dates: Array<Date | null | undefined>, fallback: Date): Date {
  let first: Date | null = null;
  for (const date of dates) {
    if (date && (!first || date < first)) first = date;
  }
  return first ?? fallback;
}
