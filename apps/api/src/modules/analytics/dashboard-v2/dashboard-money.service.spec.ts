import { Prisma, TargetMetric } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { resolveDashboardPeriod } from './dashboard-period';
import { DashboardMoneyService } from './dashboard-money.service';
import { buildRevenueTrend, windowTargets } from './dashboard-money.util';

const TENANT = 'tenant-1';
// 18 Nov 2026, 12:00 in Cairo (UTC+2).
const NOW = new Date('2026-11-18T10:00:00.000Z');
const ZONE = 'Africa/Cairo';
const thisMonth = resolveDashboardPeriod('this-month', ZONE, NOW);

const all: LeadScope = { kind: 'all', actorUserId: 'owner-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'manager-1',
  userIds: ['manager-1', 'agent-1'],
};
const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

const totalsRow = {
  reserved_count: 6,
  reserved_value: new Prisma.Decimal(60_000_000),
  prev_reserved_count: 4,
  prev_reserved_value: new Prisma.Decimal(40_000_000),
  contracted_count: 3,
  contracted_value: new Prisma.Decimal(45_000_000),
  contracted_commission: new Prisma.Decimal(900_000),
  prev_contracted_count: 2,
  prev_contracted_value: new Prisma.Decimal(30_000_000),
  prev_contracted_commission: new Prisma.Decimal(600_000),
  cancelled_count: 1,
  cancelled_value: new Prisma.Decimal(10_000_000),
  prev_cancelled_count: 0,
  prev_cancelled_value: null,
  backlog_count: 5,
  backlog_value: new Prisma.Decimal(70_000_000),
};

const stages = [
  {
    id: 's-new',
    name: 'New Lead',
    sortOrder: 1,
    pipelineId: 'p-1',
    pipeline: { name: 'Sales', isDefault: true },
  },
  {
    id: 's-neg',
    name: 'Negotiation',
    sortOrder: 2,
    pipelineId: 'p-1',
    pipeline: { name: 'Sales', isDefault: true },
  },
  {
    id: 's-empty',
    name: 'Unused',
    sortOrder: 3,
    pipelineId: 'p-1',
    pipeline: { name: 'Sales', isDefault: true },
  },
];

type RawCall = [TemplateStringsArray, ...unknown[]];

function sqlText(call: RawCall): string {
  return call[0].join('?');
}

function createPrisma() {
  return {
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({ currency: 'EGP' }),
    },
    target: { findMany: jest.fn().mockResolvedValue([]) },
    pipelineStage: { findMany: jest.fn().mockResolvedValue(stages) },
    lead: {
      groupBy: jest.fn().mockResolvedValue([
        { pipelineStageId: 's-new', _count: { _all: 10 } },
        { pipelineStageId: 's-neg', _count: { _all: 4 } },
      ]),
    },
    deal: {
      aggregate: jest.fn().mockResolvedValue({
        _avg: { price: new Prisma.Decimal(15_000_000) },
        _count: { _all: 20 },
      }),
    },
    $queryRaw: jest.fn((...call: RawCall) => {
      const text = sqlText(call);
      if (text.includes('reserved_count')) return Promise.resolve([totalsRow]);
      if (text.includes('to_char')) {
        return Promise.resolve([
          { day: '2026-11-02', revenue: new Prisma.Decimal(20_000_000) },
          { day: '2026-11-15', revenue: new Prisma.Decimal(25_000_000) },
          { day: '2026-10-02', revenue: new Prisma.Decimal(30_000_000) },
        ]);
      }
      if (text.includes('WITH closed')) {
        return Promise.resolve([
          { stage_id: 's-new', reached: 100, won: 25 },
          { stage_id: 's-neg', reached: 40, won: 25 },
        ]);
      }
      return Promise.resolve([]);
    }),
  };
}

describe('DashboardMoneyService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let service: DashboardMoneyService;

  beforeEach(() => {
    prisma = createPrisma();
    service = new DashboardMoneyService(prisma as never);
  });

  it('reports contracted revenue, commission and deal flow vs the previous window', async () => {
    const result = await service.get(TENANT, all, thisMonth);

    expect(result.currency).toBe('EGP');
    expect(result.revenue).toMatchObject({
      current: 45_000_000,
      previous: 30_000_000,
      changePercent: 50,
      target: null,
    });
    expect(result.commission).toMatchObject({
      current: 900_000,
      previous: 600_000,
      changePercent: 50,
    });
    expect(result.deals.reserved).toMatchObject({
      count: 6,
      value: 60_000_000,
      previousCount: 4,
      countChangePercent: 50,
      listQuery: {
        periodField: 'reservedAt',
        from: thisMonth.from.toISOString(),
        to: NOW.toISOString(),
      },
    });
    expect(result.deals.contracted.listQuery).toMatchObject({
      status: 'CONTRACTED',
      periodField: 'contractedAt',
    });
    // No previous cancellations: no percentage, not "infinity".
    expect(result.deals.cancelled).toMatchObject({
      count: 1,
      value: 10_000_000,
      previousCount: 0,
      previousValue: 0,
      countChangePercent: null,
    });
    expect(result.reservedBacklog).toEqual({
      count: 5,
      value: 70_000_000,
      listQuery: { status: 'RESERVED' },
    });
  });

  it('excludes cancelled deals and deleted leads and passes both windows', async () => {
    await service.get(TENANT, all, thisMonth);

    const totalsCall = prisma.$queryRaw.mock.calls.find((call) =>
      sqlText(call).includes('reserved_count'),
    ) as RawCall;
    const text = sqlText(totalsCall);
    expect(text).toContain('l."deletedAt" IS NULL');
    expect(text).toContain('d."tenantId" = ');
    const values = JSON.stringify(totalsCall.slice(1));
    // The "live deal" fragment is interpolated into every non-cancel bucket.
    expect(values).toContain("<> 'CANCELLED'");
    expect(values).toContain(thisMonth.previousFrom.toISOString());
    expect(values).toContain(TENANT);

    const trendCall = prisma.$queryRaw.mock.calls.find((call) =>
      sqlText(call).includes('to_char'),
    ) as RawCall;
    expect(sqlText(trendCall)).toContain(`d."status" <> 'CANCELLED'`);
    expect(trendCall).toContain(ZONE);
  });

  it('restricts deals to the lead scope', async () => {
    await service.get(TENANT, team, thisMonth);

    for (const call of prisma.$queryRaw.mock.calls as RawCall[]) {
      expect(JSON.stringify(call.slice(1))).toContain('agent-1');
    }
    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          AND: [
            {
              OR: [
                { assignedUserId: { in: team.userIds } },
                { assignedUserId: null },
              ],
            },
          ],
        }),
      }),
    );
  });

  describe('targets', () => {
    const targets = [
      {
        period: '2026-11',
        metric: TargetMetric.REVENUE,
        value: new Prisma.Decimal(90_000_000),
      },
      {
        period: '2026-11',
        metric: TargetMetric.DEALS,
        value: new Prisma.Decimal(12),
      },
    ];

    it('uses the workspace target for an unrestricted scope', async () => {
      prisma.target.findMany.mockResolvedValue(targets);

      const result = await service.get(TENANT, all, thisMonth);

      expect(prisma.target.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT,
            period: { in: ['2026-11'] },
            userId: null,
          }),
        }),
      );
      // 17.5 of 30 days gone → expected 52.5M by now.
      expect(result.revenue.target).toEqual({
        value: 90_000_000,
        basis: 'month',
        owner: 'workspace',
        percent: 50,
        expectedByNow: 52_500_000,
      });
      expect(result.deals.reserved.target).toMatchObject({
        value: 12,
        percent: 50,
        expectedByNow: 7,
      });
      expect(result.commission.target).toBeNull();
    });

    it('sums the team members’ targets for a team scope', async () => {
      await service.get(TENANT, team, thisMonth);

      expect(prisma.target.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: { in: team.userIds } }),
        }),
      );
    });

    it('uses the own target for an own scope', async () => {
      prisma.target.findMany.mockResolvedValue(targets);

      const result = await service.get(TENANT, own, thisMonth);

      expect(prisma.target.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'agent-1' }),
        }),
      );
      expect(result.revenue.target?.owner).toBe('own');
    });

    it('prorates monthly targets over a rolling window', () => {
      const window = resolveDashboardPeriod('last-30-days', ZONE, NOW);
      expect(window.months).toEqual(['2026-10', '2026-11']);

      const totals = windowTargets(window, [
        { period: '2026-10', metric: TargetMetric.REVENUE, value: 31_000_000 },
        { period: '2026-11', metric: TargetMetric.REVENUE, value: 30_000_000 },
      ]);

      // 20 Oct–31 Oct ≈ 12 of 31 days (October has an extra DST hour);
      // 1 Nov–18 Nov 12:00 = 17.5 of 30 days.
      expect(totals.REVENUE).toBeCloseTo(12_000_000 + 17_500_000, -5);
      expect(totals.DEALS).toBeNull();
    });

    it('labels a rolling-window target as prorated with no pace', async () => {
      prisma.target.findMany.mockResolvedValue(targets);
      const window = resolveDashboardPeriod('last-30-days', ZONE, NOW);

      const result = await service.get(TENANT, all, window);

      expect(result.revenue.target).toMatchObject({
        basis: 'prorated',
        expectedByNow: null,
      });
    });
  });

  it('forecasts open leads × stage-to-won rate × average deal price', async () => {
    const result = await service.get(TENANT, all, thisMonth);

    expect(result.forecast.averageDealPrice).toBe(15_000_000);
    expect(result.forecast.averageDealSampleSize).toBe(20);
    expect(result.forecast.stages).toEqual([
      expect.objectContaining({
        stageId: 's-new',
        openLeads: 10,
        reachedCount: 100,
        wonCount: 25,
        winRate: 0.25,
        expectedDeals: 2.5,
        expectedRevenue: 37_500_000,
        listQuery: { stageIds: 's-new', openOnly: 'true' },
      }),
      expect.objectContaining({
        stageId: 's-neg',
        openLeads: 4,
        winRate: 0.625,
        expectedDeals: 2.5,
        expectedRevenue: 37_500_000,
      }),
    ]);
    // A stage with neither open leads nor history is left out.
    expect(result.forecast.stages.map((row) => row.stageId)).not.toContain(
      's-empty',
    );
    expect(result.forecast.totals).toEqual({
      openLeads: 14,
      expectedDeals: 5,
      expectedRevenue: 75_000_000,
    });
  });

  it('looks back 12 months for rates and the average price', async () => {
    await service.get(TENANT, all, thisMonth);

    const lookback = new Date('2025-11-18T10:00:00.000Z');
    const historyCall = prisma.$queryRaw.mock.calls.find((call) =>
      sqlText(call).includes('WITH closed'),
    ) as RawCall;
    expect(sqlText(historyCall)).toContain("'STAGE_CHANGED'");
    expect(historyCall).toContainEqual(lookback);
    expect(prisma.deal.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          status: { not: 'CANCELLED' },
          reservedAt: { gte: lookback },
          lead: { tenantId: TENANT, deletedAt: null },
        }),
      }),
    );
  });

  describe('trend', () => {
    it('buckets per local day and aligns the previous window by day', async () => {
      const result = await service.get(TENANT, all, thisMonth);

      expect(result.trend.granularity).toBe('day');
      expect(result.trend.points).toHaveLength(18);
      expect(result.trend.points[1]).toEqual({
        date: '2026-11-02',
        previousDate: '2026-10-02',
        current: 20_000_000,
        previous: 30_000_000,
      });
      expect(result.trend.points[14].current).toBe(25_000_000);
    });

    it('buckets a 90-day window per week', () => {
      const window = resolveDashboardPeriod('last-90-days', ZONE, NOW);
      const trend = buildRevenueTrend(
        window,
        new Map([
          ['2026-08-21', 5],
          ['2026-08-27', 7],
          ['2026-11-18', 1],
          ['2026-08-20', 100],
        ]),
      );

      expect(trend.granularity).toBe('week');
      expect(trend.points).toHaveLength(13);
      expect(trend.points[0]).toMatchObject({
        date: '2026-08-21',
        current: 12,
      });
      expect(trend.points[12].current).toBe(1);
      // 20 Aug is the last day of the previous window → its last week.
      expect(trend.points[12].previous).toBe(100);
    });
  });
});
