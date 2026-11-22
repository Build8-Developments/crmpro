import { Prisma, TargetMetric } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { monthBounds } from '../../../common/utils/month-period.util';
import { resolveDashboardPeriod } from './dashboard-period';
import { DashboardTeamService } from './dashboard-team.service';
import {
  median,
  monthShare,
  percentOf,
  prorateTargets,
} from './dashboard-team.util';

const TZ = 'Africa/Cairo';
const NOW = new Date('2026-11-18T10:00:00.000Z'); // Wed 12:00 Cairo
const all: LeadScope = { kind: 'all', actorUserId: 'owner-1' };
const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

type Raw = { strings: string; values: unknown[] };

const isSql = (value: unknown): value is { sql: string; values: unknown[] } =>
  typeof value === 'object' &&
  value !== null &&
  'sql' in value &&
  'values' in value;

/** Flattens a tagged-template call (nested Prisma.Sql included) to text + values. */
function flatten(args: unknown[]): Raw {
  const [strings, ...values] = args as [TemplateStringsArray, ...unknown[]];
  const flat: unknown[] = [];
  let text = strings[0];
  values.forEach((value, index) => {
    if (isSql(value)) {
      text += value.sql;
      flat.push(...value.values);
    } else {
      text += '?';
      flat.push(value);
    }
    text += strings[index + 1];
  });
  return { strings: text, values: flat };
}

function makePrisma(rows: {
  heatmap?: unknown[];
  recent?: unknown[];
  firstResponses?: unknown[];
}) {
  const raw: Raw[] = [];
  return {
    raw,
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({
        currency: 'EGP',
        weekStartsOn: 6,
        // Always open, so working minutes = wall-clock minutes in tests.
        workingDays: [],
        workdayStartMinute: 0,
        workdayEndMinute: 1440,
      }),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'agent-1', name: 'Amal', team: null },
        {
          id: 'agent-2',
          name: 'Badr',
          team: { id: 'team-1', name: 'North', deletedAt: null },
        },
      ]),
    },
    userDailyStat: {
      groupBy: jest.fn().mockResolvedValue([
        {
          userId: 'agent-1',
          _sum: { tasksDue: 10, tasksDone: 8, slaHits: 3, slaMisses: 1 },
          _max: { computedAt: new Date('2026-11-18T09:45:00.000Z') },
        },
      ]),
    },
    task: {
      groupBy: jest
        .fn()
        .mockResolvedValue([{ assigneeId: 'agent-2', _count: { _all: 4 } }]),
    },
    target: {
      findMany: jest.fn().mockResolvedValue([
        {
          userId: 'agent-1',
          period: '2026-11',
          metric: TargetMetric.DEALS,
          value: new Prisma.Decimal(4),
        },
        {
          userId: 'agent-1',
          period: '2026-11',
          metric: TargetMetric.REVENUE,
          value: new Prisma.Decimal(1_000_000),
        },
      ]),
    },
    $queryRaw: jest.fn((...args: unknown[]) => {
      const call = flatten(args);
      raw.push(call);
      if (call.strings.includes('EXTRACT(DOW')) {
        return Promise.resolve(rows.heatmap ?? []);
      }
      if (call.strings.includes('"today"')) {
        return Promise.resolve(rows.recent ?? []);
      }
      if (call.strings.includes('first_touch')) {
        return Promise.resolve(rows.firstResponses ?? []);
      }
      return Promise.resolve([]);
    }),
  };
}

function makeActuals() {
  return {
    compute: jest.fn().mockResolvedValue({
      byUser: new Map([
        [
          'agent-1',
          {
            DEALS: 3,
            REVENUE: 500_000,
            COMMISSION: 10_000,
            INTERACTIONS: 120,
            VISITS: 6,
          },
        ],
      ]),
      total: {},
    }),
  };
}

const minutes = (start: string, value: number) => ({
  startedAt: new Date(start),
  contactedAt: new Date(new Date(start).getTime() + value * 60_000),
});

describe('DashboardTeamService', () => {
  const period = resolveDashboardPeriod('this-month', TZ, NOW);

  it('builds one row per member with rates, median and target %', async () => {
    const prisma = makePrisma({
      recent: [{ userId: 'agent-1', today: 5, week: 22 }],
      firstResponses: [
        { userId: 'agent-1', ...minutes('2026-11-02T08:00:00Z', 4) },
        { userId: 'agent-1', ...minutes('2026-11-03T08:00:00Z', 30) },
        { userId: 'agent-1', ...minutes('2026-11-04T08:00:00Z', 10) },
        { userId: 'agent-2', ...minutes('2026-11-04T08:00:00Z', 2) },
      ],
      heatmap: [
        { weekday: 1, hour: 11, count: 7 },
        { weekday: 3, hour: 15, count: 3 },
      ],
    });
    const actuals = makeActuals();
    const service = new DashboardTeamService(prisma as never, actuals as never);

    const result = await service.get('tenant-1', all, period);

    const amal = result.members.find((m) => m.id === 'agent-1')!;
    expect(amal).toMatchObject({
      interactionsToday: 5,
      interactionsThisWeek: 22,
      interactions: 120,
      taskCompletionPct: 80,
      slaCompliancePct: 75,
      medianFirstResponseMinutes: 10,
      firstResponseSamples: 3,
      visits: 6,
      deals: 3,
      revenue: 500_000,
      overdueNow: 0,
      // Deals is the headline when set: 3 of 4.
      targetMetric: TargetMetric.DEALS,
      targetPercent: 75,
    });
    expect(amal.targets.map((t) => [t.metric, t.percent])).toEqual([
      [TargetMetric.DEALS, 75],
      [TargetMetric.REVENUE, 50],
    ]);

    const badr = result.members.find((m) => m.id === 'agent-2')!;
    expect(badr).toMatchObject({
      team: { id: 'team-1', name: 'North' },
      overdueNow: 4,
      taskCompletionPct: null,
      slaCompliancePct: null,
      targetPercent: null,
      targets: [],
    });

    // Median of every sample (2, 4, 10, 30), not a median of medians.
    expect(result.totals.medianFirstResponseMinutes).toBe(7);
    expect(result.totals.overdueNow).toBe(4);
    expect(result.statsComputedAt).toBe('2026-11-18T09:45:00.000Z');
    expect(result.heatmap).toEqual({
      cells: [
        { weekday: 1, hour: 11, count: 7 },
        { weekday: 3, hour: 15, count: 3 },
      ],
      max: 7,
      total: 10,
    });
  });

  it('reads daily stats by local day and actuals for the exact window', async () => {
    const prisma = makePrisma({});
    const actuals = makeActuals();
    const service = new DashboardTeamService(prisma as never, actuals as never);

    await service.get('tenant-1', all, period);

    const { where } = prisma.userDailyStat.groupBy.mock.calls[0][0];
    expect(where.day).toEqual({
      gte: new Date('2026-11-01T00:00:00.000Z'),
      lte: new Date('2026-11-18T00:00:00.000Z'),
    });
    expect(actuals.compute).toHaveBeenCalledWith('tenant-1', {
      start: period.from,
      end: period.to,
    });
    // Week starts Saturday 14 Nov (Cairo), today starts 18 Nov local midnight.
    const recent = prisma.raw.find((call) => call.strings.includes('"today"'))!;
    expect(recent.values).toContainEqual(new Date('2026-11-17T22:00:00.000Z'));
    expect(recent.values).toContainEqual(new Date('2026-11-13T22:00:00.000Z'));
  });

  it('limits an agent to themself, heatmap included', async () => {
    const prisma = makePrisma({});
    const service = new DashboardTeamService(
      prisma as never,
      makeActuals() as never,
    );

    await service.get('tenant-1', own, period);

    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({
      tenantId: 'tenant-1',
      isActive: true,
      deletedAt: null,
      id: { in: ['agent-1'] },
    });
    const heatmap = prisma.raw.find((call) =>
      call.strings.includes('EXTRACT(DOW'),
    )!;
    expect(heatmap.strings).toContain('i."userId" = ANY(');
    expect(heatmap.values).toContainEqual(['agent-1']);
    expect(heatmap.values).toContain('tenant-1');
  });

  it('does not filter the heatmap by user for the whole workspace', async () => {
    const prisma = makePrisma({});
    const service = new DashboardTeamService(
      prisma as never,
      makeActuals() as never,
    );

    await service.get('tenant-1', all, period);

    expect(prisma.user.findMany.mock.calls[0][0].where).not.toHaveProperty(
      'id',
    );
    const heatmap = prisma.raw.find((call) =>
      call.strings.includes('EXTRACT(DOW'),
    )!;
    expect(heatmap.strings).not.toContain('i."userId" = ANY(');
  });

  it('skips per-user queries when nobody is in scope', async () => {
    const prisma = makePrisma({});
    prisma.user.findMany.mockResolvedValue([]);
    const actuals = makeActuals();
    const service = new DashboardTeamService(prisma as never, actuals as never);

    const result = await service.get('tenant-1', own, period);

    expect(result.members).toEqual([]);
    expect(result.totals.taskCompletionPct).toBeNull();
    expect(actuals.compute).not.toHaveBeenCalled();
    expect(prisma.userDailyStat.groupBy).not.toHaveBeenCalled();
  });
});

describe('dashboard team math', () => {
  it('computes percentages and medians', () => {
    expect(percentOf(2, 3)).toBe(66.7);
    expect(percentOf(1, 0)).toBeNull();
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });

  it('uses the month target as-is for a calendar-month window', () => {
    const period = resolveDashboardPeriod('this-month', TZ, NOW);
    expect(monthShare('2026-11', period, monthBounds('2026-11', TZ))).toBe(1);
    expect(monthShare('2026-10', period, monthBounds('2026-10', TZ))).toBe(0);
  });

  it('prorates targets over a rolling window by the time of each month it covers', () => {
    const now = new Date('2026-11-30T22:00:00.000Z'); // Dec 1, 00:00 Cairo
    const period = resolveDashboardPeriod('last-30-days', TZ, now);
    // 30 days ending Dec 1 local: Nov 2 – Dec 1 → 29/30 of November, 1/31 of December.
    const result = prorateTargets(
      [
        {
          userId: 'a',
          period: '2026-11',
          metric: TargetMetric.DEALS,
          value: 30,
        },
        {
          userId: 'a',
          period: '2026-12',
          metric: TargetMetric.DEALS,
          value: 31,
        },
        {
          userId: null,
          period: '2026-11',
          metric: TargetMetric.DEALS,
          value: 99,
        },
      ],
      period,
      (month) => monthBounds(month, TZ),
    );
    const deals = result.get('a')!.get(TargetMetric.DEALS)!;
    // 29 + a sliver of December (the window ends "now", 0h into Dec 1).
    expect(deals).toBeCloseTo(29, 0);
    expect(result.has('null')).toBe(false);
    expect(result.size).toBe(1);
  });
});
