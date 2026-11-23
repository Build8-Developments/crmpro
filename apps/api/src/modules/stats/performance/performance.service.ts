import { Injectable, Logger } from '@nestjs/common';
import { TargetMetric } from '@crmpro/database';
import { FAST_FIRST_CONTACT_MINUTES } from '@crmpro/shared/achievements';
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
} from './performance.types';
import {
  bestMonth,
  canSeeLeaderboard,
  fastContactStreak,
  monthlySeries,
  mostVisitsInWeek,
  rankLeaderboard,
} from './performance.utils';

const DEFAULT_CURRENCY = 'EGP';
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
        select: { currency: true, showLeaderboardToAgents: true },
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
    const showRank = canSeeLeaderboard(
      settings?.showLeaderboardToAgents ?? true,
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
        showRank
          ? this.leaderboard(tenantId, user.id, period, timeZone)
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
   * This month among active people who can record deals (deal.write), by
   * contracted revenue then deals reserved — the same numbers as targets.
   */
  private async leaderboard(
    tenantId: string,
    meId: string,
    period: string,
    timeZone: string,
  ): Promise<LeaderboardView> {
    const [people, actuals] = await Promise.all([
      this.prisma.user.findMany({
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
        select: { id: true, name: true },
      }),
      this.targetActuals.compute(tenantId, monthBounds(period, timeZone)),
    ]);
    const ranked = rankLeaderboard(
      people.map((person) => {
        const values = actuals.byUser.get(person.id);
        return {
          userId: person.id,
          name: person.name,
          revenue: values?.[TargetMetric.REVENUE] ?? 0,
          deals: values?.[TargetMetric.DEALS] ?? 0,
        };
      }),
      meId,
    );
    return { period, ...ranked };
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
