import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { type LeadScope, scopeUserIds } from '../../common/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { TenantClockService } from '../workflow/common/tenant-clock.service';
import { DailyStatsService } from './daily-stats.service';
import { GetDailyStatsQueryDto } from './dto/get-daily-stats-query.dto';
import {
  DEFAULT_RANGE_DAYS,
  MAX_RANGE_DAYS,
  STREAK_LOOKBACK_DAYS,
} from './stats.constants';
import type {
  DailyStatRow,
  DailyStatsResponse,
  MyStatsSummaryResponse,
  StatCounters,
  StatTotals,
} from './stats.types';
import {
  computeStreak,
  INT_COUNTER_KEYS,
  type IntCounterKey,
  type StreakDay,
} from './utils/daily-counters';
import {
  addDays,
  dayToDbDate,
  daysInRange,
  dbDateToDay,
  isLocalDay,
  localDayOf,
  weekdayOf,
} from './utils/local-day.util';

const STREAK_RULE =
  'Consecutive working days with at least 80% of the tasks due done, or — on days with nothing due — at least the daily interaction goal. Days off and days with no activity at all are skipped; today counts once it qualifies.';

const SUM_FIELDS = {
  interactions: true,
  calls: true,
  whatsapps: true,
  meetings: true,
  visits: true,
  answered: true,
  tasksDue: true,
  tasksDone: true,
  tasksOverdue: true,
  tasksSnoozed: true,
  slaHits: true,
  slaMisses: true,
  firstResponseCount: true,
  firstResponseMinutesTotal: true,
  dealsReserved: true,
  dealsContracted: true,
  dealsCancelled: true,
  revenue: true,
  commission: true,
} as const satisfies Prisma.UserDailyStatSumAggregateInputType &
  Record<IntCounterKey, true>;

type CounterSource = {
  [K in IntCounterKey]: number | null;
} & {
  revenue: Prisma.Decimal | null;
  commission: Prisma.Decimal | null;
};

function toCounters(source: CounterSource): StatCounters {
  const ints = Object.fromEntries(
    INT_COUNTER_KEYS.map((key) => [key, source[key] ?? 0]),
  ) as Record<IntCounterKey, number>;
  return {
    ...ints,
    revenue: source.revenue ? source.revenue.toNumber() : 0,
    commission: source.commission ? source.commission.toNumber() : 0,
  };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function withAverages(counters: StatCounters): StatTotals {
  const slaTotal = counters.slaHits + counters.slaMisses;
  return {
    ...counters,
    avgFirstResponseMinutes:
      counters.firstResponseCount > 0
        ? round(
            counters.firstResponseMinutesTotal / counters.firstResponseCount,
            1,
          )
        : null,
    slaHitRate: slaTotal > 0 ? round(counters.slaHits / slaTotal, 3) : null,
  };
}

/** Sums rows already mapped to numbers (money summed as Decimal). */
function sumRows(rows: CounterSource[]): StatTotals {
  const total = Object.fromEntries(
    INT_COUNTER_KEYS.map((key) => [key, 0]),
  ) as Record<IntCounterKey, number>;
  let revenue = new Prisma.Decimal(0);
  let commission = new Prisma.Decimal(0);
  for (const row of rows) {
    for (const key of INT_COUNTER_KEYS) total[key] += row[key] ?? 0;
    revenue = revenue.add(row.revenue ?? 0);
    commission = commission.add(row.commission ?? 0);
  }
  return withAverages(toCounters({ ...total, revenue, commission }));
}

/**
 * Reads `UserDailyStat` for dashboards (spec §5) and "My performance"
 * (spec §4.1). Ranges are local days in the workspace time zone.
 */
@Injectable()
export class StatsQueryService {
  private readonly logger = new Logger(StatsQueryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantClockService,
    private readonly dailyStats: DailyStatsService,
  ) {}

  async getDaily(
    user: AuthenticatedUser,
    scope: LeadScope,
    query: GetDailyStatsQueryDto,
    now = new Date(),
  ): Promise<DailyStatsResponse> {
    const tenantId = user.tenantId;
    const timeZone = await this.clock.getTimeZone(tenantId);
    const to = query.to ?? localDayOf(now, timeZone);
    const from = query.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));
    if (!isLocalDay(from) || !isLocalDay(to)) {
      throw new BadRequestException('from and to must be real dates');
    }
    if (from > to) {
      throw new BadRequestException('from must be on or before to');
    }
    if (daysInRange(from, to) > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `The range can cover at most ${MAX_RANGE_DAYS} days`,
      );
    }

    const userIds = await this.resolveUserIds(tenantId, scope, query);
    const records =
      userIds !== null && userIds.length === 0
        ? []
        : await this.prisma.userDailyStat.findMany({
            where: {
              tenantId,
              day: { gte: dayToDbDate(from), lte: dayToDbDate(to) },
              ...(userIds ? { userId: { in: userIds } } : {}),
            },
            orderBy: [{ day: 'asc' }, { userId: 'asc' }],
          });

    const presentIds = [...new Set(records.map((record) => record.userId))];
    const users =
      presentIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { tenantId, id: { in: presentIds } },
            select: { id: true, name: true, teamId: true },
            orderBy: { name: 'asc' },
          });

    const rows: DailyStatRow[] = records.map((record) => ({
      day: dbDateToDay(record.day),
      userId: record.userId,
      ...toCounters(record),
      computedAt: record.computedAt.toISOString(),
    }));

    return {
      from,
      to,
      timeZone,
      rows,
      totals: sumRows(records),
      users,
    };
  }

  async getMySummary(
    user: AuthenticatedUser,
    now = new Date(),
  ): Promise<MyStatsSummaryResponse> {
    const tenantId = user.tenantId;
    try {
      await this.dailyStats.refreshToday(tenantId, user.id, now);
    } catch (error) {
      // Stale-by-a-few-minutes numbers beat a failed screen.
      this.logger.warn(
        `Today refresh failed for user ${user.id}: ${String(error)}`,
      );
    }

    const [settings, tenantSettings] = await Promise.all([
      this.clock.getWorkflowSettings(tenantId),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { weekStartsOn: true },
      }),
    ]);
    const timeZone = settings.schedule.timeZone;
    const weekStartsOn = tenantSettings?.weekStartsOn ?? 6;
    const today = localDayOf(now, timeZone);
    const weekStart = addDays(
      today,
      -((weekdayOf(today) - weekStartsOn + 7) % 7),
    );
    const monthStart = `${today.slice(0, 7)}-01`;
    const lookbackStart = addDays(today, -STREAK_LOOKBACK_DAYS);
    const rowsFrom = [lookbackStart, weekStart, monthStart].sort()[0];

    const [records, allTime] = await Promise.all([
      this.prisma.userDailyStat.findMany({
        where: {
          tenantId,
          userId: user.id,
          day: { gte: dayToDbDate(rowsFrom), lte: dayToDbDate(today) },
        },
        orderBy: { day: 'asc' },
      }),
      this.prisma.userDailyStat.aggregate({
        where: { tenantId, userId: user.id },
        _sum: SUM_FIELDS,
      }),
    ]);

    const withDay = records.map((record) => ({
      ...record,
      localDay: dbDateToDay(record.day),
    }));
    const between = (from: string) =>
      withDay.filter((r) => r.localDay >= from && r.localDay <= today);
    const todayRecord = withDay.find((r) => r.localDay === today);

    const streakDays = new Map<string, StreakDay>(
      withDay.map((r) => [
        r.localDay,
        {
          tasksDue: r.tasksDue,
          tasksDone: r.tasksDone,
          interactions: r.interactions,
        },
      ]),
    );

    return {
      timeZone,
      today: { from: today, to: today, totals: sumRows(between(today)) },
      week: { from: weekStart, to: today, totals: sumRows(between(weekStart)) },
      month: {
        from: monthStart,
        to: today,
        totals: sumRows(between(monthStart)),
      },
      allTime: {
        from: null,
        to: today,
        totals: withAverages(toCounters(allTime._sum)),
      },
      streak: {
        days: computeStreak({
          today,
          days: streakDays,
          workingDays: settings.schedule.workingDays,
          dailyInteractionGoal: settings.dailyInteractionGoal,
          lookbackDays: STREAK_LOOKBACK_DAYS,
        }),
        rule: STREAK_RULE,
      },
      todayComputedAt: todayRecord?.computedAt.toISOString() ?? null,
    };
  }

  /**
   * The users whose rows the caller may read, narrowed by the filters; null
   * means everyone in the tenant. Scope follows lead visibility: read-all
   * sees everyone, read-team their team(s), everyone else only themselves.
   */
  private async resolveUserIds(
    tenantId: string,
    scope: LeadScope,
    query: GetDailyStatsQueryDto,
  ): Promise<string[] | null> {
    let userIds = scopeUserIds(scope);

    if (query.userId) {
      if (userIds && !userIds.includes(query.userId)) {
        throw new ForbiddenException(
          'You can only view stats of people in your scope',
        );
      }
      userIds = [query.userId];
    }

    if (query.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: query.teamId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!team) throw new NotFoundException('Team not found');
      const members = await this.prisma.user.findMany({
        where: { tenantId, teamId: team.id },
        select: { id: true },
      });
      const memberIds = new Set(members.map((member) => member.id));
      userIds = userIds
        ? userIds.filter((id) => memberIds.has(id))
        : [...memberIds];
    }

    return userIds;
  }
}
