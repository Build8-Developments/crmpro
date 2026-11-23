import { Injectable } from '@nestjs/common';
import { Prisma, TargetMetric, TaskStatus } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  DEFAULT_WORK_SCHEDULE,
  type WorkSchedule,
} from '@crmpro/shared/workflow';
import {
  scopeUserIds,
  type LeadScope,
} from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { monthBounds } from '../../../common/utils/month-period.util';
import {
  addDays,
  dayToDbDate,
  localDayBounds,
  localDayOf,
  weekdayOf,
} from '../../stats/utils/local-day.util';
import { TargetActualsService } from '../../targets/target-actuals.service';
import type { DashboardPeriod } from './dashboard-period';
import {
  firstResponseSample,
  median,
  percentOf,
  prorateTargets,
  TARGET_HEADLINE_ORDER,
} from './dashboard-team.util';
import type {
  DashboardTeamMember,
  DashboardTeamResponse,
  DashboardTeamTarget,
} from './dashboard-team.types';

const DEFAULT_CURRENCY = 'EGP';
const DEFAULT_WEEK_STARTS_ON = 6;

interface WorkspaceSettings {
  timeZone: string;
  currency: string;
  weekStartsOn: number;
  schedule: WorkSchedule;
}

interface Member {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
}

/**
 * §5.3 "Is the team doing the work?" — one row per active person who works
 * leads (role has lead.read) inside the caller's scope: the owner sees
 * everyone, a team manager their team(s), an agent only themself.
 *
 * Sources, chosen per metric:
 * - interactions (today / this week / period), visits, deals, revenue and
 *   target actuals are counted live from the source tables (via
 *   TargetActualsService for the period), so they match the targets screen;
 * - task completion and SLA compliance come from `UserDailyStat` (the daily
 *   classification is too involved to redo here; today's row is refreshed
 *   every 15 minutes) — `statsComputedAt` says how fresh they are;
 * - overdue is "now" (open tasks past due), not a period figure;
 * - median first response is computed from raw lead rows (the daily rows
 *   only hold totals) in working minutes of the workspace schedule.
 */
@Injectable()
export class DashboardTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targetActuals: TargetActualsService,
  ) {}

  async get(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardTeamResponse> {
    const [settings, members] = await Promise.all([
      this.loadSettings(tenantId, period.timeZone),
      this.listMembers(tenantId, scope),
    ]);
    const ids = members.map((member) => member.id);
    const heatmap = await this.heatmap(tenantId, scope, period);

    const base: Omit<DashboardTeamResponse, 'members' | 'totals'> = {
      period: {
        key: period.key,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        timeZone: period.timeZone,
      },
      currency: settings.currency,
      weekStartsOn: settings.weekStartsOn,
      statsComputedAt: null,
      heatmap,
    };
    if (ids.length === 0) {
      return { ...base, members: [], totals: buildTotals([], []) };
    }

    const today = localDayOf(period.now, period.timeZone);
    const todayStart = localDayBounds(today, period.timeZone).start;
    const weekStartDay = addDays(
      today,
      -((weekdayOf(today) - settings.weekStartsOn + 7) % 7),
    );
    const weekStart = localDayBounds(weekStartDay, period.timeZone).start;
    const fromDay = localDayOf(period.from, period.timeZone);
    const toDay = localDayOf(
      new Date(period.to.getTime() - 1),
      period.timeZone,
    );

    const [recent, stats, overdue, firstResponses, actuals, targets] =
      await Promise.all([
        this.prisma.$queryRaw<
          Array<{ userId: string; today: number; week: number }>
        >`
          SELECT i."userId" AS "userId",
                 COUNT(*) FILTER (WHERE i."occurredAt" >= ${todayStart})::int AS "today",
                 COUNT(*)::int AS "week"
          FROM "Interaction" i
          JOIN "Lead" l ON l."id" = i."leadId" AND l."deletedAt" IS NULL
          WHERE i."tenantId" = ${tenantId}::uuid
            AND i."userId" = ANY(${ids}::uuid[])
            AND i."occurredAt" >= ${weekStart}
            AND i."occurredAt" <= ${period.now}
          GROUP BY i."userId"
        `,
        this.prisma.userDailyStat.groupBy({
          by: ['userId'],
          where: {
            tenantId,
            userId: { in: ids },
            day: { gte: dayToDbDate(fromDay), lte: dayToDbDate(toDay) },
          },
          _sum: {
            tasksDue: true,
            tasksDone: true,
            slaHits: true,
            slaMisses: true,
          },
          _max: { computedAt: true },
        }),
        this.prisma.task.groupBy({
          by: ['assigneeId'],
          where: {
            tenantId,
            assigneeId: { in: ids },
            status: TaskStatus.OPEN,
            dueAt: { lt: period.now },
            OR: [{ leadId: null }, { lead: { deletedAt: null } }],
          },
          _count: { _all: true },
        }),
        // Assignment time falls back to creation for leads assigned before
        // `assignedAt` existed (intake assigns on creation). Only touches the
        // assignee made themself count, like the daily stats.
        this.prisma.$queryRaw<
          Array<{ userId: string; startedAt: Date; contactedAt: Date }>
        >`
          SELECT l."assignedUserId" AS "userId",
                 COALESCE(l."assignedAt", l."createdAt") AS "startedAt",
                 l."firstContactedAt" AS "contactedAt"
          FROM "Lead" l
          WHERE l."tenantId" = ${tenantId}::uuid
            AND l."deletedAt" IS NULL
            AND l."assignedUserId" = ANY(${ids}::uuid[])
            AND l."firstContactedAt" >= ${period.from}
            AND l."firstContactedAt" < ${period.to}
            AND l."firstContactedAt" >= COALESCE(l."assignedAt", l."createdAt")
            AND (
              SELECT first_touch."userId"
              FROM "Interaction" first_touch
              WHERE first_touch."leadId" = l."id"
              ORDER BY first_touch."occurredAt" ASC
              LIMIT 1
            ) = l."assignedUserId"
        `,
        this.targetActuals.compute(tenantId, {
          start: period.from,
          end: period.to,
        }),
        this.prisma.target.findMany({
          where: {
            tenantId,
            period: { in: period.months },
            userId: { in: ids },
          },
          select: { userId: true, period: true, metric: true, value: true },
        }),
      ]);

    const recentBy = new Map(recent.map((row) => [row.userId, row]));
    const statsBy = new Map(stats.map((row) => [row.userId, row]));
    const overdueBy = new Map(
      overdue.map((row) => [row.assigneeId, row._count._all]),
    );
    const minutesBy = new Map<string, number[]>();
    for (const row of firstResponses) {
      const minutes = firstResponseSample(
        row.startedAt,
        row.contactedAt,
        settings.schedule,
      );
      const list = minutesBy.get(row.userId) ?? [];
      list.push(minutes);
      minutesBy.set(row.userId, list);
    }
    const targetsBy = prorateTargets(
      targets.map((row) => ({
        userId: row.userId,
        period: row.period,
        metric: row.metric,
        value: row.value.toNumber(),
      })),
      period,
      (month) => monthBounds(month, period.timeZone),
    );

    const rows: DashboardTeamMember[] = members.map((member) => {
      const stat = statsBy.get(member.id);
      const actual = actuals.byUser.get(member.id);
      const tasksDue = stat?._sum.tasksDue ?? 0;
      const tasksDone = stat?._sum.tasksDone ?? 0;
      const slaHits = stat?._sum.slaHits ?? 0;
      const slaMisses = stat?._sum.slaMisses ?? 0;
      const minutes = minutesBy.get(member.id) ?? [];

      const memberTargets: DashboardTeamTarget[] = [];
      const targetValues = targetsBy.get(member.id);
      for (const metric of TARGET_HEADLINE_ORDER) {
        const target = targetValues?.get(metric);
        if (target === undefined || target <= 0) continue;
        const value = actual?.[metric] ?? 0;
        memberTargets.push({
          metric,
          target: round(target, 2),
          actual: value,
          percent: round((value / target) * 100, 1),
        });
      }
      const headline = memberTargets[0] ?? null;

      return {
        id: member.id,
        name: member.name,
        team: member.team,
        interactionsToday: recentBy.get(member.id)?.today ?? 0,
        interactionsThisWeek: recentBy.get(member.id)?.week ?? 0,
        interactions: actual?.[TargetMetric.INTERACTIONS] ?? 0,
        tasksDue,
        tasksDone,
        taskCompletionPct: percentOf(tasksDone, tasksDue),
        overdueNow: overdueBy.get(member.id) ?? 0,
        slaHits,
        slaMisses,
        slaCompliancePct: percentOf(slaHits, slaHits + slaMisses),
        medianFirstResponseMinutes: median(minutes),
        firstResponseSamples: minutes.length,
        visits: actual?.[TargetMetric.VISITS] ?? 0,
        deals: actual?.[TargetMetric.DEALS] ?? 0,
        revenue: actual?.[TargetMetric.REVENUE] ?? 0,
        targetPercent: headline?.percent ?? null,
        targetMetric: headline?.metric ?? null,
        targets: memberTargets,
      };
    });

    const computedAt = stats
      .map((row) => row._max.computedAt)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return {
      ...base,
      statsComputedAt: computedAt?.toISOString() ?? null,
      members: rows,
      totals: buildTotals(rows, [...minutesBy.values()].flat()),
    };
  }

  /** Interactions by local weekday × hour in the period. */
  private async heatmap(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardTeamResponse['heatmap']> {
    const userIds = scopeUserIds(scope);
    const byUser =
      userIds === null
        ? Prisma.sql`TRUE`
        : Prisma.sql`i."userId" = ANY(${userIds}::uuid[])`;
    const local = Prisma.sql`((i."occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${period.timeZone})`;

    const rows = await this.prisma.$queryRaw<
      Array<{ weekday: number; hour: number; count: number }>
    >`
      SELECT EXTRACT(DOW FROM ${local})::int AS "weekday",
             EXTRACT(HOUR FROM ${local})::int AS "hour",
             COUNT(*)::int AS "count"
      FROM "Interaction" i
      JOIN "Lead" l ON l."id" = i."leadId" AND l."deletedAt" IS NULL
      WHERE i."tenantId" = ${tenantId}::uuid
        AND i."occurredAt" >= ${period.from}
        AND i."occurredAt" < ${period.to}
        AND ${byUser}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
    const cells = rows.map((row) => ({
      weekday: Number(row.weekday),
      hour: Number(row.hour),
      count: Number(row.count),
    }));
    return {
      cells,
      max: cells.reduce((max, cell) => Math.max(max, cell.count), 0),
      total: cells.reduce((sum, cell) => sum + cell.count, 0),
    };
  }

  private async loadSettings(
    tenantId: string,
    timeZone: string,
  ): Promise<WorkspaceSettings> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        currency: true,
        weekStartsOn: true,
        workingDays: true,
        workdayStartMinute: true,
        workdayEndMinute: true,
      },
    });
    if (!settings) {
      return {
        timeZone,
        currency: DEFAULT_CURRENCY,
        weekStartsOn: DEFAULT_WEEK_STARTS_ON,
        schedule: { ...DEFAULT_WORK_SCHEDULE, timeZone },
      };
    }
    return {
      timeZone,
      currency: settings.currency,
      weekStartsOn: settings.weekStartsOn,
      schedule: {
        timeZone,
        workingDays: settings.workingDays,
        startMinute: settings.workdayStartMinute,
        endMinute: settings.workdayEndMinute,
      },
    };
  }

  /** Active people who can hold leads (role has lead.read), in scope. */
  private async listMembers(
    tenantId: string,
    scope: LeadScope,
  ): Promise<Member[]> {
    const userIds = scopeUserIds(scope);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(userIds ? { id: { in: userIds } } : {}),
        role: {
          permissions: {
            some: { permission: { key: PERMISSIONS.LEAD_READ } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        team: { select: { id: true, name: true, deletedAt: true } },
      },
      orderBy: { name: 'asc' },
    });
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      team:
        user.team && !user.team.deletedAt
          ? { id: user.team.id, name: user.team.name }
          : null,
    }));
  }
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildTotals(
  rows: DashboardTeamMember[],
  allMinutes: number[],
): DashboardTeamResponse['totals'] {
  const sum = (pick: (row: DashboardTeamMember) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const tasksDue = sum((row) => row.tasksDue);
  const tasksDone = sum((row) => row.tasksDone);
  const slaHits = sum((row) => row.slaHits);
  const slaMisses = sum((row) => row.slaMisses);
  return {
    interactionsToday: sum((row) => row.interactionsToday),
    interactionsThisWeek: sum((row) => row.interactionsThisWeek),
    interactions: sum((row) => row.interactions),
    tasksDue,
    tasksDone,
    taskCompletionPct: percentOf(tasksDone, tasksDue),
    overdueNow: sum((row) => row.overdueNow),
    slaHits,
    slaMisses,
    slaCompliancePct: percentOf(slaHits, slaHits + slaMisses),
    medianFirstResponseMinutes: median(allMinutes),
    firstResponseSamples: allMinutes.length,
    visits: sum((row) => row.visits),
    deals: sum((row) => row.deals),
    revenue: round(
      sum((row) => row.revenue),
      2,
    ),
  };
}
