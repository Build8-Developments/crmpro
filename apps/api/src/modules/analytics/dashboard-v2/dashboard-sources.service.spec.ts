import { Prisma } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { monthBounds } from '../../../common/utils/month-period.util';
import { resolveDashboardPeriod } from './dashboard-period';
import { DashboardSourcesService } from './dashboard-sources.service';
import {
  costPer,
  prorateSpend,
  rate,
  spendShare,
} from './dashboard-sources.util';

const TZ = 'Africa/Cairo';
const NOW = new Date('2026-11-18T10:00:00.000Z');
const all: LeadScope = { kind: 'all', actorUserId: 'owner-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'lead-1',
  userIds: ['lead-1', 'agent-1'],
};

type Raw = { text: string; values: unknown[] };

const isSql = (value: unknown): value is { sql: string; values: unknown[] } =>
  typeof value === 'object' &&
  value !== null &&
  'sql' in value &&
  'values' in value;

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
  return { text, values: flat };
}

function makePrisma() {
  const raw: Raw[] = [];
  return {
    raw,
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({ currency: 'EGP' }),
    },
    sourceSpend: {
      findMany: jest.fn().mockResolvedValue([
        {
          sourceId: 'src-fb',
          period: '2026-11',
          amount: new Prisma.Decimal(100_000),
        },
        // Spend on a source that brought no leads this month still shows up.
        {
          sourceId: 'src-radio',
          period: '2026-11',
          amount: new Prisma.Decimal(20_000),
        },
      ]),
    },
    leadSource: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'src-fb', name: 'Facebook Ads' },
        { id: 'src-radio', name: 'Radio' },
        { id: 'src-ref', name: 'Referral' },
      ]),
    },
    project: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'p-1', name: 'Palm Hills', developer: { name: 'PHD' } },
        { id: 'p-2', name: 'Zed', developer: null },
      ]),
    },
    $queryRaw: jest.fn((...args: unknown[]) => {
      const call = flatten(args);
      raw.push(call);
      if (call.text.includes('LEFT JOIN LATERAL')) {
        return Promise.resolve([
          {
            sourceId: 'src-fb',
            leads: 50,
            contacted: 45,
            visited: 10,
            won: 4,
            closed: 20,
            deals: 5,
            revenue: 9_000_000,
          },
          {
            sourceId: 'src-ref',
            leads: 10,
            contacted: 10,
            visited: 5,
            won: 3,
            closed: 4,
            deals: 3,
            revenue: 6_000_000,
          },
          {
            sourceId: null,
            leads: 2,
            contacted: 1,
            visited: 0,
            won: 0,
            closed: 0,
            deals: 0,
            revenue: 0,
          },
        ]);
      }
      if (call.text.includes('"LeadProjectInterest"')) {
        return Promise.resolve([
          { projectId: 'p-1', interested: 40, hot: 12 },
          { projectId: 'p-2', interested: 8, hot: 1 },
        ]);
      }
      if (call.text.includes('FROM "Deal" d')) {
        return Promise.resolve([
          { projectId: 'p-1', deals: 4, revenue: 7_500_000 },
        ]);
      }
      return Promise.resolve([]);
    }),
  };
}

describe('DashboardSourcesService', () => {
  const period = resolveDashboardPeriod('this-month', TZ, NOW);

  it('computes rates and costs per source from the cohort and spend', async () => {
    const prisma = makePrisma();
    const service = new DashboardSourcesService(prisma as never);

    const result = await service.get('tenant-1', all, period);

    expect(result.spendVisible).toBe(true);
    expect(result.spendBasis).toBe('full-month');
    expect(result.sources.map((row) => row.name)).toEqual([
      'Facebook Ads',
      'Referral',
      'No source',
      'Radio',
    ]);
    expect(result.sources[0]).toMatchObject({
      sourceId: 'src-fb',
      leads: 50,
      contactRate: 90,
      visitRate: 20,
      winRate: 20,
      revenue: 9_000_000,
      spend: 100_000,
      costPerLead: 2000,
      costPerVisit: 10_000,
      costPerDeal: 20_000,
    });
    // No spend entered → no costs, not zero costs.
    expect(result.sources[1]).toMatchObject({ spend: null, costPerLead: null });
    expect(result.sources[3]).toMatchObject({
      name: 'Radio',
      leads: 0,
      spend: 20_000,
      costPerLead: null,
    });
    expect(result.totals).toMatchObject({
      leads: 62,
      deals: 8,
      spend: 120_000,
      costPerLead: 1935,
      costPerDeal: 15_000,
      winRate: 29.2,
    });
  });

  it('puts project demand next to sales', async () => {
    const prisma = makePrisma();
    const service = new DashboardSourcesService(prisma as never);

    const result = await service.get('tenant-1', all, period);

    expect(result.projects).toEqual([
      {
        projectId: 'p-1',
        name: 'Palm Hills',
        developerName: 'PHD',
        interestedLeads: 40,
        hotInterest: 12,
        deals: 4,
        revenue: 7_500_000,
        conversionRate: 10,
      },
      {
        projectId: 'p-2',
        name: 'Zed',
        developerName: null,
        interestedLeads: 8,
        hotInterest: 1,
        deals: 0,
        revenue: 0,
        conversionRate: 0,
      },
    ]);
  });

  it('scopes every query to the team and hides workspace spend', async () => {
    const prisma = makePrisma();
    const service = new DashboardSourcesService(prisma as never);

    const result = await service.get('tenant-1', team, period);

    expect(prisma.sourceSpend.findMany).not.toHaveBeenCalled();
    expect(result.spendVisible).toBe(false);
    expect(result.sources.every((row) => row.spend === null)).toBe(true);
    expect(result.sources.some((row) => row.name === 'Radio')).toBe(false);
    expect(prisma.raw).toHaveLength(3);
    for (const call of prisma.raw) {
      expect(call.values).toContain('tenant-1');
      expect(call.text).toContain('l."assignedUserId" = ANY(');
      expect(call.values).toContainEqual(['lead-1', 'agent-1']);
      expect(call.text).toContain('"deletedAt" IS NULL');
    }
  });

  it('filters the cohort by creation inside the period', async () => {
    const prisma = makePrisma();
    const service = new DashboardSourcesService(prisma as never);

    await service.get('tenant-1', all, period);

    const cohort = prisma.raw.find((call) =>
      call.text.includes('LEFT JOIN LATERAL'),
    )!;
    expect(cohort.text).toContain('l."createdAt" >= ?');
    expect(cohort.values).toContainEqual(period.from);
    expect(cohort.values).toContainEqual(period.to);
    expect(cohort.text).not.toContain('ANY(');
  });
});

describe('dashboard sources math', () => {
  it('rates and costs', () => {
    expect(rate(1, 3)).toBe(33.3);
    expect(rate(0, 0)).toBeNull();
    expect(costPer(1000, 3)).toBe(333);
    expect(costPer(null, 3)).toBeNull();
    expect(costPer(1000, 0)).toBeNull();
  });

  it('uses a calendar month entry as-is', () => {
    const period = resolveDashboardPeriod('last-month', TZ, NOW);
    expect(spendShare('2026-10', period, monthBounds('2026-10', TZ))).toBe(1);
    expect(spendShare('2026-11', period, monthBounds('2026-11', TZ))).toBe(0);
  });

  it('prorates past months and takes the running month as spent so far', () => {
    // 30 days to Nov 18 (Cairo): Oct 20 – Nov 18 → 12 of October's 31 days,
    // and all of November so far.
    const period = resolveDashboardPeriod('last-30-days', TZ, NOW);
    const spend = prorateSpend(
      [
        { sourceId: 's', period: '2026-10', amount: 31_000 },
        { sourceId: 's', period: '2026-11', amount: 18_000 },
        { sourceId: 's', period: '2026-09', amount: 99_000 },
      ],
      period,
      (month) => monthBounds(month, TZ),
    );
    // October is 31 days + 1 hour (DST ends) — allow for it.
    expect(Math.abs(spend.get('s')! - 30_000)).toBeLessThan(50);
  });
});
