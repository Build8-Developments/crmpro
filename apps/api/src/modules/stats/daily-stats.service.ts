import { Injectable, Logger } from '@nestjs/common';
import { DealStatus, Prisma, TaskStatus } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { TenantClockService } from '../workflow/common/tenant-clock.service';
import {
  MAX_RANGE_DAYS,
  REFRESH_THROTTLE_SECONDS,
  SLA_LOOKBACK_DAYS,
  STATS_CLAIM_KEYS,
} from './stats.constants';
import {
  addInteractionGroup,
  classifySla,
  CounterBook,
  type DailyCounters,
  firstResponseMinutes,
  isAllZero,
  type SlaContext,
} from './utils/daily-counters';
import {
  addDays,
  dayToDbDate,
  daysInRange,
  isLocalDay,
  localDayBounds,
  localDayOf,
} from './utils/local-day.util';

const DAY_MS = 24 * 60 * 60_000;

export interface ComputeDayResult {
  day: string;
  /** Rows upserted (users with at least one non-zero counter). */
  written: number;
  /** Rows deleted because they became all-zero. */
  removed: number;
}

/**
 * Computes `UserDailyStat` rows (spec §2.8): one row per user per local day in
 * the workspace time zone, holding only additive counters. A day is always
 * recomputed from the source tables, so running it twice gives the same rows.
 *
 * Attribution follows the records as they are now (current task assignee,
 * current lead owner, current due date). The job computes each day right
 * after it ends, so history is frozen close to how the day really went;
 * backfilled days are an approximation for reassigned or rescheduled work.
 */
@Injectable()
export class DailyStatsService {
  private readonly logger = new Logger(DailyStatsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantClockService,
    private readonly scheduler: SchedulerService,
  ) {}

  /**
   * Recompute one local day for the tenant (or only `userIds`). Users whose
   * counters are all zero get no row; an existing row that became all-zero is
   * deleted. About ten grouped queries per day, independent of team size.
   */
  async computeDay(
    tenantId: string,
    day: string,
    userIds?: readonly string[],
    now = new Date(),
  ): Promise<ComputeDayResult> {
    if (!isLocalDay(day)) throw new Error(`Invalid local day: ${day}`);
    if (userIds && userIds.length === 0) return { day, written: 0, removed: 0 };

    const settings = await this.clock.getWorkflowSettings(tenantId);
    const { start, end } = localDayBounds(day, settings.schedule.timeZone);
    if (start > now) return { day, written: 0, removed: 0 };

    const book = await this.collect(tenantId, start, end, userIds, now, {
      firstContactSlaMinutes: settings.firstContactSlaMinutes,
      schedule: settings.schedule,
    });
    return this.write(tenantId, day, book, userIds, now);
  }

  /**
   * Fresh numbers for one user's today, for screens that show them. At most
   * once per user per minute (across instances); returns false when skipped.
   */
  async refreshToday(
    tenantId: string,
    userId: string,
    now = new Date(),
  ): Promise<boolean> {
    const claim = await this.scheduler.claim(
      STATS_CLAIM_KEYS.refresh(tenantId, userId),
      REFRESH_THROTTLE_SECONDS,
    );
    if (!claim) return false;
    const timeZone = await this.clock.getTimeZone(tenantId);
    await this.computeDay(tenantId, localDayOf(now, timeZone), [userId], now);
    return true;
  }

  /**
   * A deal changed after the fact (cancelled, price fixed, re-credited): the
   * days it was counted on are recomputed for the agents involved, so a
   * cancelled sale stops counting as revenue on its contract day. Best effort.
   */
  async recomputeForDeal(
    tenantId: string,
    deals: ReadonlyArray<{
      agentId: string | null;
      reservedAt: Date;
      contractedAt: Date | null;
      cancelledAt: Date | null;
    }>,
    now = new Date(),
  ): Promise<void> {
    const agents = [
      ...new Set(
        deals.map((deal) => deal.agentId).filter((id): id is string => !!id),
      ),
    ];
    if (agents.length === 0) return;
    try {
      const timeZone = await this.clock.getTimeZone(tenantId);
      const days = new Set<string>();
      for (const deal of deals) {
        for (const at of [
          deal.reservedAt,
          deal.contractedAt,
          deal.cancelledAt,
        ]) {
          if (at) days.add(localDayOf(at, timeZone));
        }
      }
      for (const day of days) {
        await this.computeDay(tenantId, day, agents, now);
      }
    } catch (error) {
      this.logger.warn(
        `Deal stats recompute failed for tenant ${tenantId}: ${String(error)}`,
      );
    }
  }

  /**
   * Recompute every day in [from, to] (newest first). Internal: used by the
   * scheduler backfill and for manual repairs. Returns the days computed.
   */
  async backfillRange(
    tenantId: string,
    from: string,
    to: string,
    now = new Date(),
  ): Promise<number> {
    if (!isLocalDay(from) || !isLocalDay(to) || from > to) {
      throw new Error(`Invalid backfill range: ${from}..${to}`);
    }
    if (daysInRange(from, to) > MAX_RANGE_DAYS) {
      throw new Error(`Backfill range too long: ${from}..${to}`);
    }
    let computed = 0;
    for (let day = to; day >= from; day = addDays(day, -1)) {
      await this.computeDay(tenantId, day, undefined, now);
      computed += 1;
    }
    this.logger.log(
      `Backfilled ${computed} day(s) of stats for tenant ${tenantId}`,
    );
    return computed;
  }

  // ─── Collect ───────────────────────────────────────────────────────────

  private async collect(
    tenantId: string,
    start: Date,
    end: Date,
    userIds: readonly string[] | undefined,
    now: Date,
    sla: Pick<SlaContext, 'firstContactSlaMinutes' | 'schedule'>,
  ): Promise<CounterBook> {
    const inDay = { gte: start, lt: end };
    const users = userIds ? { in: [...userIds] } : undefined;
    const ownedBy = userIds ? { in: [...userIds] } : { not: null };
    // "Overdue" is judged at the end of the day — or now, for today.
    const cutoff = end < now ? end : now;

    const [
      interactions,
      tasksDue,
      tasksDone,
      tasksOverdue,
      snoozes,
      dealsReserved,
      dealsContracted,
      dealsCancelled,
      slaLeads,
      firstContacts,
    ] = await Promise.all([
      this.prisma.interaction.groupBy({
        by: ['userId', 'channel', 'outcome'],
        where: {
          tenantId,
          userId: users,
          lead: { deletedAt: null },
          occurredAt: inDay,
        },
        _count: { _all: true },
      }),
      // System-cancelled tasks (lead closed, rebooked) were never the
      // agent's to do.
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          tenantId,
          assigneeId: users,
          dueAt: inDay,
          status: { not: TaskStatus.CANCELLED },
        },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          tenantId,
          assigneeId: users,
          status: TaskStatus.DONE,
          completedAt: inDay,
        },
        _count: { _all: true },
      }),
      // Due before the cutoff and not closed (done, skipped, cancelled)
      // before it.
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          tenantId,
          assigneeId: users,
          dueAt: { lt: cutoff },
          createdAt: { lt: cutoff },
          OR: [{ status: TaskStatus.OPEN }, { completedAt: { gte: cutoff } }],
        },
        _count: { _all: true },
      }),
      this.snoozesByUser(tenantId, start, end),
      this.prisma.deal.groupBy({
        by: ['agentId'],
        where: {
          tenantId,
          agentId: ownedBy,
          lead: { deletedAt: null },
          status: { not: DealStatus.CANCELLED },
          reservedAt: inDay,
        },
        _count: { _all: true },
      }),
      this.prisma.deal.groupBy({
        by: ['agentId'],
        where: {
          tenantId,
          agentId: ownedBy,
          lead: { deletedAt: null },
          status: { not: DealStatus.CANCELLED },
          contractedAt: inDay,
        },
        _count: { _all: true },
        _sum: { price: true, commissionAmount: true },
      }),
      this.prisma.deal.groupBy({
        by: ['agentId'],
        where: {
          tenantId,
          agentId: ownedBy,
          lead: { deletedAt: null },
          cancelledAt: inDay,
        },
        _count: { _all: true },
      }),
      // Deadlines falling on the day belong to assignments made up to a
      // couple of weeks earlier (nights, weekends).
      this.prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          assignedUserId: ownedBy,
          assignedAt: {
            gte: new Date(start.getTime() - SLA_LOOKBACK_DAYS * DAY_MS),
            lt: end,
          },
        },
        select: {
          assignedUserId: true,
          assignedAt: true,
          firstContactedAt: true,
          slaBreachedAt: true,
          closedAt: true,
        },
      }),
      this.prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          assignedUserId: ownedBy,
          assignedAt: { not: null },
          firstContactedAt: inDay,
        },
        select: {
          assignedUserId: true,
          assignedAt: true,
          firstContactedAt: true,
          interactions: {
            orderBy: { occurredAt: 'asc' },
            take: 1,
            select: { userId: true },
          },
        },
      }),
    ]);

    const book = new CounterBook();

    for (const group of interactions) {
      addInteractionGroup(book.for(group.userId), {
        channel: group.channel,
        outcome: group.outcome,
        count: group._count._all,
      });
    }
    for (const group of tasksDue) {
      book.for(group.assigneeId).tasksDue += group._count._all;
    }
    for (const group of tasksDone) {
      book.for(group.assigneeId).tasksDone += group._count._all;
    }
    for (const group of tasksOverdue) {
      book.for(group.assigneeId).tasksOverdue += group._count._all;
    }
    for (const row of snoozes) {
      if (!row.userId || (userIds && !userIds.includes(row.userId))) continue;
      book.for(row.userId).tasksSnoozed += Number(row.count);
    }
    for (const group of dealsReserved) {
      if (!group.agentId) continue;
      book.for(group.agentId).dealsReserved += group._count._all;
    }
    for (const group of dealsContracted) {
      if (!group.agentId) continue;
      const counters = book.for(group.agentId);
      counters.dealsContracted += group._count._all;
      counters.revenue = counters.revenue.add(group._sum.price ?? 0);
      counters.commission = counters.commission.add(
        group._sum.commissionAmount ?? 0,
      );
    }
    for (const group of dealsCancelled) {
      if (!group.agentId) continue;
      book.for(group.agentId).dealsCancelled += group._count._all;
    }

    const slaContext = { ...sla, dayStart: start, dayEnd: end, now };
    for (const lead of slaLeads) {
      if (!lead.assignedUserId || !lead.assignedAt) continue;
      const result = classifySla(
        {
          assignedAt: lead.assignedAt,
          firstContactedAt: lead.firstContactedAt,
          slaBreachedAt: lead.slaBreachedAt,
          closedAt: lead.closedAt,
        },
        slaContext,
      );
      if (result === 'hit') book.for(lead.assignedUserId).slaHits += 1;
      if (result === 'miss') book.for(lead.assignedUserId).slaMisses += 1;
    }

    for (const lead of firstContacts) {
      if (!lead.assignedUserId || !lead.assignedAt || !lead.firstContactedAt) {
        continue;
      }
      const minutes = firstResponseMinutes(
        {
          assignedUserId: lead.assignedUserId,
          assignedAt: lead.assignedAt,
          firstContactedAt: lead.firstContactedAt,
          firstInteractionUserId: lead.interactions[0]?.userId ?? null,
        },
        sla.schedule,
      );
      if (minutes === null) continue;
      const counters = book.for(lead.assignedUserId);
      counters.firstResponseCount += 1;
      counters.firstResponseMinutesTotal += minutes;
    }

    return book;
  }

  /**
   * Snoozes are TASK_RESCHEDULED activities flagged `snooze` (moved later,
   * with a reason), credited to the task's assignee. Lead-less tasks write no
   * activity, so their snoozes are not dated and not counted here.
   */
  private snoozesByUser(
    tenantId: string,
    start: Date,
    end: Date,
  ): Promise<Array<{ userId: string | null; count: number }>> {
    return this.prisma.$queryRaw<
      Array<{ userId: string | null; count: number }>
    >`
      SELECT COALESCE(a."metadata"->>'assigneeId', a."actorUserId"::text) AS "userId",
             COUNT(*)::int AS "count"
      FROM "LeadActivity" a
      WHERE a."tenantId" = ${tenantId}::uuid
        AND a."eventType" = 'TASK_RESCHEDULED'
        AND a."createdAt" >= ${start}
        AND a."createdAt" < ${end}
        AND a."metadata"->>'snooze' = 'true'
      GROUP BY 1
    `;
  }

  // ─── Write ─────────────────────────────────────────────────────────────

  private async write(
    tenantId: string,
    day: string,
    book: CounterBook,
    userIds: readonly string[] | undefined,
    now: Date,
  ): Promise<ComputeDayResult> {
    const candidates = book.entries().filter(([, c]) => !isAllZero(c));

    // Ids come from tenant-filtered rows, except snoozes (JSON metadata):
    // keep only real users of this tenant.
    const known =
      candidates.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { tenantId, id: { in: candidates.map(([id]) => id) } },
            select: { id: true },
          });
    const knownIds = new Set(known.map((user) => user.id));
    const rows = candidates.filter(([userId]) => knownIds.has(userId));
    const keepIds = rows.map(([userId]) => userId);
    const dbDay = dayToDbDate(day);

    const operations: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.userDailyStat.deleteMany({
        where: {
          tenantId,
          day: dbDay,
          userId: userIds
            ? { in: [...userIds], notIn: keepIds }
            : { notIn: keepIds },
        },
      }),
      ...rows.map(([userId, counters]) =>
        this.prisma.userDailyStat.upsert({
          where: { tenantId_userId_day: { tenantId, userId, day: dbDay } },
          create: { tenantId, userId, day: dbDay, ...toData(counters, now) },
          update: toData(counters, now),
        }),
      ),
    ];
    const [deleted] = (await this.prisma.$transaction(operations)) as [
      Prisma.BatchPayload,
      ...unknown[],
    ];

    return { day, written: rows.length, removed: deleted.count };
  }
}

function toData(counters: DailyCounters, computedAt: Date) {
  return { ...counters, computedAt };
}
