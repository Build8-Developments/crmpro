import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { resolveDashboardPeriod } from './dashboard-period';
import { DashboardLossesService } from './dashboard-losses.service';
import type { DashboardLossesStage } from './dashboard-losses.types';
import { buildBreakdown, buildCohorts } from './dashboard-losses.util';

const TZ = 'Africa/Cairo';
const NOW = new Date('2026-11-18T10:00:00.000Z');
const all: LeadScope = { kind: 'all', actorUserId: 'owner-1' };
const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

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

const STAGES = [
  { id: 'new', name: 'New', sortOrder: 1, closeType: null },
  { id: 'qualified', name: 'Qualified', sortOrder: 2, closeType: null },
  { id: 'nego', name: 'Negotiation', sortOrder: 3, closeType: null },
  { id: 'won', name: 'Won', sortOrder: 4, closeType: 'WON' },
  { id: 'lost', name: 'Lost', sortOrder: 5, closeType: 'LOST' },
];

const FUNNEL = { pipelineId: 'pipe-1', pipelineName: 'Sales', stages: [] };

function makePrisma(overrides: { pipeline?: unknown } = {}) {
  const raw: Raw[] = [];
  return {
    raw,
    pipeline: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          'pipeline' in overrides
            ? overrides.pipeline
            : { id: 'pipe-1', name: 'Sales', stages: STAGES },
        ),
    },
    lostReason: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'r-budget', name: 'Budget too low', recyclable: true },
        { id: 'r-else', name: 'Bought elsewhere', recyclable: false },
      ]),
    },
    leadSource: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'src-fb', name: 'Facebook Ads' }]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'agent-1', name: 'Amal' }]),
    },
    task: { count: jest.fn().mockResolvedValue(6) },
    $queryRaw: jest.fn((...args: unknown[]) => {
      const call = flatten(args);
      raw.push(call);
      if (call.text.includes('WITH cohort AS')) {
        return Promise.resolve([
          { month: '2026-11', maxOpenSort: 1, won: false, count: 6 },
          { month: '2026-11', maxOpenSort: 2, won: false, count: 3 },
          { month: '2026-11', maxOpenSort: 1, won: true, count: 1 },
        ]);
      }
      if (call.text.includes('WITH moves AS')) {
        return Promise.resolve([
          { stageId: 'new', avgDays: 2.345, medianDays: 1.04, exits: 12 },
          { stageId: 'lost', avgDays: 9, medianDays: 9, exits: 1 },
        ]);
      }
      if (call.text.includes('"lostReasonId" AS "reasonId"')) {
        return Promise.resolve([
          {
            reasonId: 'r-budget',
            sourceId: 'src-fb',
            userId: 'agent-1',
            count: 5,
          },
          { reasonId: 'r-else', sourceId: 'src-fb', userId: null, count: 2 },
          { reasonId: null, sourceId: null, userId: 'agent-1', count: 1 },
        ]);
      }
      if (call.text.includes('won ON TRUE')) {
        return Promise.resolve([
          {
            leadId: 'lead-9',
            name: 'Omar',
            userId: 'agent-1',
            userName: 'Amal',
            lostAt: new Date('2026-07-01T10:00:00.000Z'),
            wonAt: new Date('2026-11-10T10:00:00.000Z'),
            lostReasonName: 'Postponed decision',
            viaReEngage: true,
          },
          {
            leadId: 'lead-8',
            name: 'Mona',
            userId: null,
            userName: null,
            lostAt: new Date('2026-10-01T10:00:00.000Z'),
            wonAt: new Date('2026-11-05T10:00:00.000Z'),
            lostReasonName: null,
            viaReEngage: false,
          },
        ]);
      }
      return Promise.resolve([]);
    }),
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  const pipelineAnalytics = {
    getPipeline: jest.fn().mockResolvedValue(FUNNEL),
  };
  return {
    service: new DashboardLossesService(
      prisma as never,
      pipelineAnalytics as never,
    ),
    pipelineAnalytics,
  };
}

describe('DashboardLossesService', () => {
  const period = resolveDashboardPeriod('this-month', TZ, NOW);

  it('builds cohorts, stage durations, lost reasons and won-back leads', async () => {
    const prisma = makePrisma();
    const { service, pipelineAnalytics } = makeService(prisma);

    const result = await service.get('tenant-1', all, period);

    expect(result.funnelStages.map((stage) => stage.stageId)).toEqual([
      'new',
      'qualified',
      'nego',
      'won',
    ]);
    expect(result.cohorts.map((cohort) => cohort.month)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    const november = result.cohorts[5];
    expect(november.leads).toBe(10);
    expect(november.reached.map((step) => step.count)).toEqual([10, 4, 1, 1]);
    expect(result.cohorts[0]).toMatchObject({ leads: 0 });

    // Only open stages; rounded to one decimal.
    expect(result.stageDurations).toEqual([
      { stageId: 'new', name: 'New', avgDays: 2.3, medianDays: 1, exits: 12 },
      {
        stageId: 'qualified',
        name: 'Qualified',
        avgDays: null,
        medianDays: null,
        exits: 0,
      },
      {
        stageId: 'nego',
        name: 'Negotiation',
        avgDays: null,
        medianDays: null,
        exits: 0,
      },
    ]);

    expect(result.lost.total).toBe(8);
    expect(result.lost.reasons).toEqual([
      {
        reasonId: 'r-budget',
        name: 'Budget too low',
        count: 5,
        percent: 62.5,
        recyclable: true,
      },
      {
        reasonId: 'r-else',
        name: 'Bought elsewhere',
        count: 2,
        percent: 25,
        recyclable: false,
      },
      {
        reasonId: null,
        name: 'No reason given',
        count: 1,
        percent: 12.5,
        recyclable: false,
      },
    ]);
    expect(result.lost.bySource).toEqual([
      {
        id: 'src-fb',
        name: 'Facebook Ads',
        total: 7,
        reasons: [
          { reasonId: 'r-budget', count: 5 },
          { reasonId: 'r-else', count: 2 },
        ],
      },
      {
        id: null,
        name: 'No source',
        total: 1,
        reasons: [{ reasonId: null, count: 1 }],
      },
    ]);
    expect(result.lost.byAgent.map((row) => [row.name, row.total])).toEqual([
      ['Amal', 6],
      ['Unassigned', 2],
    ]);

    expect(result.wonBack).toMatchObject({
      count: 2,
      viaReEngage: 1,
      reEngageTasks: 6,
    });
    expect(result.wonBack.leads[0]).toMatchObject({
      leadId: 'lead-9',
      agent: { id: 'agent-1', name: 'Amal' },
      lostAt: '2026-07-01T10:00:00.000Z',
    });
    expect(result.wonBack.leads[1].agent).toBeNull();

    expect(result.funnel).toBe(FUNNEL);
    expect(pipelineAnalytics.getPipeline).toHaveBeenCalledWith('tenant-1', all);
  });

  it('uses the period for losses, stage exits and wins, and the calendar for cohorts', async () => {
    const prisma = makePrisma();
    const { service } = makeService(prisma);

    await service.get('tenant-1', all, period);

    const byText = (needle: string) =>
      prisma.raw.find((call) => call.text.includes(needle))!;
    for (const needle of [
      'WITH moves AS',
      '"lostReasonId" AS "reasonId"',
      'won ON TRUE',
    ]) {
      const call = byText(needle);
      expect(call.values).toContainEqual(period.from);
      expect(call.values).toContainEqual(period.to);
    }
    // Cohorts start on June 1 (Cairo, UTC+3 in summer).
    expect(byText('WITH cohort AS').values).toContainEqual(
      new Date('2026-05-31T21:00:00.000Z'),
    );
    expect(byText('won ON TRUE').values).toContain('re_engage');
    expect(prisma.task.count.mock.calls[0][0].where).toMatchObject({
      tenantId: 'tenant-1',
      ruleKey: 're_engage',
      createdAt: { gte: period.from, lt: period.to },
    });
  });

  it('scopes every query to the caller', async () => {
    const prisma = makePrisma();
    const { service, pipelineAnalytics } = makeService(prisma);

    await service.get('tenant-1', own, period);

    expect(prisma.raw).toHaveLength(4);
    for (const call of prisma.raw) {
      expect(call.values).toContain('tenant-1');
      expect(call.text).toContain('l."assignedUserId" = ANY(');
      expect(call.values).toContainEqual(['agent-1']);
      expect(call.text).toContain('l."deletedAt" IS NULL');
    }
    expect(prisma.task.count.mock.calls[0][0].where).toHaveProperty('lead');
    expect(pipelineAnalytics.getPipeline).toHaveBeenCalledWith('tenant-1', own);
  });

  it('still answers lost reasons and wins without a pipeline', async () => {
    const prisma = makePrisma({ pipeline: null });
    const { service } = makeService(prisma);

    const result = await service.get('tenant-1', all, period);

    expect(result.pipeline).toBeNull();
    expect(result.cohorts).toEqual([]);
    expect(result.lost.total).toBe(8);
  });
});

describe('dashboard losses math', () => {
  const steps: DashboardLossesStage[] = [
    { stageId: 'a', name: 'A', sortOrder: 1, closeType: null },
    { stageId: 'b', name: 'B', sortOrder: 2, closeType: null },
    { stageId: 'c', name: 'C', sortOrder: 3, closeType: null },
    { stageId: 'w', name: 'Won', sortOrder: 4, closeType: 'WON' },
  ];

  it('counts a later stage, or a win, as passing every earlier one', () => {
    const [cohort] = buildCohorts(['2026-10'], steps, [
      { month: '2026-10', maxOpenSort: 1, won: false, count: 5 },
      { month: '2026-10', maxOpenSort: 3, won: false, count: 3 },
      // Won straight from A: still passed B and C.
      { month: '2026-10', maxOpenSort: 1, won: true, count: 2 },
      // Created straight into Lost: in the cohort, past nothing.
      { month: '2026-10', maxOpenSort: null, won: false, count: 2 },
      { month: '2026-09', maxOpenSort: 3, won: true, count: 9 },
    ]);
    expect(cohort.leads).toBe(12);
    expect(cohort.reached).toEqual([
      { stageId: 'a', count: 12, percent: 100, fromPrevious: null },
      { stageId: 'b', count: 5, percent: 41.7, fromPrevious: 41.7 },
      { stageId: 'c', count: 5, percent: 41.7, fromPrevious: 100 },
      { stageId: 'w', count: 2, percent: 16.7, fromPrevious: 40 },
    ]);
  });

  it('handles an empty cohort', () => {
    const [cohort] = buildCohorts(['2026-10'], steps, []);
    expect(cohort.leads).toBe(0);
    expect(cohort.reached.every((step) => step.percent === null)).toBe(true);
  });

  it('groups a breakdown and keeps the largest groups', () => {
    const rows = buildBreakdown(
      [
        { key: 'x', reasonId: 'r1', count: 1 },
        { key: 'y', reasonId: 'r1', count: 4 },
        { key: 'x', reasonId: 'r2', count: 2 },
        { key: 'x', reasonId: 'r1', count: 1 },
        { key: 'z', reasonId: 'r1', count: 1 },
      ],
      (key) => key ?? '-',
      2,
    );
    expect(rows).toEqual([
      {
        id: 'x',
        name: 'x',
        total: 4,
        reasons: [
          { reasonId: 'r1', count: 2 },
          { reasonId: 'r2', count: 2 },
        ],
      },
      { id: 'y', name: 'y', total: 4, reasons: [{ reasonId: 'r1', count: 4 }] },
    ]);
  });
});
