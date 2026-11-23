import { Prisma } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { LeadScope } from '../../../common/auth';
import { emptyMetricValues } from '../../targets/target-actuals.service';
import { AchievementsService } from '../achievements/achievements.service';
import { PerformanceService } from './performance.service';

const USER = {
  id: 'agent-1',
  tenantId: 'tenant-1',
  roleId: 'role',
  sessionId: 's',
};
// Wednesday 2026-11-18, 14:00 Cairo.
const NOW = new Date('2026-11-18T12:00:00Z');
const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'agent-1',
  userIds: ['agent-1', 'agent-2'],
};

function build(
  options: {
    leaderboardMode?: 'OFF' | 'RANK_ONLY' | 'TARGET_PERCENT' | 'FULL';
  } = {},
) {
  const prisma = {
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({
        weekStartsOn: 6,
        currency: 'EGP',
        leaderboardMode: options.leaderboardMode ?? 'TARGET_PERCENT',
      }),
    },
    user: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ createdAt: new Date('2025-03-01T00:00:00Z') }),
      findMany: jest.fn().mockResolvedValue([
        { id: 'agent-1', name: 'Mona', showOnLeaderboard: true },
        { id: 'agent-2', name: 'Karim', showOnLeaderboard: false },
      ]),
    },
    target: {
      // Mona: 12M of 10M (120%); Karim: 20M of 40M (50%).
      findMany: jest.fn().mockResolvedValue([
        {
          userId: 'agent-1',
          metric: 'REVENUE',
          value: new Prisma.Decimal(10_000_000),
        },
        {
          userId: 'agent-2',
          metric: 'REVENUE',
          value: new Prisma.Decimal(40_000_000),
        },
      ]),
    },
    deal: {
      findMany: jest.fn().mockResolvedValue([
        {
          reservedAt: new Date('2026-11-02T10:00:00Z'),
          contractedAt: new Date('2026-11-10T10:00:00Z'),
          price: new Prisma.Decimal(12_000_000),
          commissionAmount: new Prisma.Decimal(300_000),
          lead: { source: { name: 'Referral' } },
        },
        {
          reservedAt: new Date('2026-06-02T10:00:00Z'),
          contractedAt: null,
          price: new Prisma.Decimal(5_000_000),
          commissionAmount: null,
          lead: { source: null },
        },
      ]),
    },
    lead: { findMany: jest.fn().mockResolvedValue([]) },
    userDailyStat: { findMany: jest.fn().mockResolvedValue([]) },
    userAchievement: {
      // Recent wins (filtered by unlockedAt) vs the caller's own badges.
      findMany: jest.fn((args: { where: { unlockedAt?: unknown } }) =>
        Promise.resolve(
          args.where.unlockedAt
            ? [
                {
                  key: 'revenue',
                  level: 1,
                  unlockedAt: new Date('2026-11-15T10:00:00Z'),
                  user: { id: 'agent-1', name: 'Mona' },
                },
                {
                  key: 'deals',
                  level: 2,
                  unlockedAt: new Date('2026-11-14T10:00:00Z'),
                  user: { id: 'agent-1', name: 'Mona' },
                },
                {
                  key: 'deals',
                  level: 2,
                  unlockedAt: new Date('2026-11-13T10:00:00Z'),
                  user: { id: 'agent-3', name: 'Salma' },
                },
              ]
            : [],
        ),
      ),
      createMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
    interaction: {
      count: jest.fn().mockResolvedValue(42),
      // History older than the account (imported or re-seeded data).
      aggregate: jest.fn().mockResolvedValue({
        _min: { occurredAt: new Date('2024-12-15T09:00:00Z') },
      }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ occurredAt: new Date('2026-11-16T10:00:00Z') }]),
      groupBy: jest
        .fn()
        .mockResolvedValue([{ leadId: 'l1' }, { leadId: 'l2' }]),
    },
  };
  const clock = {
    getWorkflowSettings: jest.fn().mockResolvedValue({
      schedule: DEFAULT_WORK_SCHEDULE,
      firstContactSlaMinutes: 15,
      escalateAfterMinutes: 30,
      dailyInteractionGoal: 25,
    }),
  };
  const notifications = { trigger: jest.fn().mockResolvedValue(undefined) };
  const achievements = new AchievementsService(
    prisma as never,
    clock as never,
    notifications as never,
  );
  const dailyStats = { refreshToday: jest.fn().mockResolvedValue(true) };
  const targets = {
    getMine: jest.fn().mockResolvedValue({ period: '2026-11' }),
  };
  const actuals = {
    compute: jest.fn().mockResolvedValue({
      byUser: new Map([
        ['agent-2', { ...emptyMetricValues(), REVENUE: 20_000_000, DEALS: 2 }],
        ['agent-1', { ...emptyMetricValues(), REVENUE: 12_000_000, DEALS: 1 }],
      ]),
      total: emptyMetricValues(),
    }),
  };
  const service = new PerformanceService(
    prisma as never,
    achievements,
    dailyStats as never,
    targets as never,
    actuals as never,
  );
  return { service, prisma, targets, actuals, dailyStats, notifications };
}

describe('PerformanceService.getMyPerformance', () => {
  it('returns all-time totals, the 12-month series, bests and badges', async () => {
    const { service, dailyStats } = build();

    const data = await service.getMyPerformance(
      USER,
      own,
      new Set(['analytics.read', 'target.read']),
      NOW,
    );

    expect(dailyStats.refreshToday).toHaveBeenCalledWith(
      'tenant-1',
      'agent-1',
      NOW,
    );
    expect(data.period).toBe('2026-11');
    expect(data.currency).toBe('EGP');
    expect(data.allTime).toEqual({
      deals: 2,
      units: 2,
      revenue: 12_000_000,
      commission: 300_000,
      interactions: 42,
      visits: 1,
      clientsServed: 2,
      // The earliest interaction, not the account's creation.
      since: '2024-12-15T09:00:00.000Z',
    });
    expect(data.months).toHaveLength(12);
    expect(data.months[0].period).toBe('2025-12');
    expect(data.months[11]).toEqual({
      period: '2026-11',
      deals: 1,
      revenue: 12_000_000,
    });
    expect(data.bests.bestRevenueMonth).toEqual({
      period: '2026-11',
      value: 12_000_000,
    });
    expect(data.bests.mostVisitsWeek).toEqual({
      weekStart: '2026-11-14',
      value: 1,
    });

    const deals = data.badges.find((badge) => badge.key === 'deals');
    expect(deals).toMatchObject({
      value: 2,
      currentLevel: 1,
      next: { level: 2, threshold: 5, remaining: 3, progress: 0.4 },
    });
    expect(deals?.levels[0].unlockedAt).toBe('2026-06-02T10:00:00.000Z');
    expect(deals?.levels[1].unlockedAt).toBeNull();
    const revenue = data.badges.find((badge) => badge.key === 'revenue');
    expect(revenue?.currentLevel).toBe(1);
    expect(data.badges.map((badge) => badge.key)).toHaveLength(7);
  });

  it("ranks agents by % of target and sends no one else's money", async () => {
    const { service } = build({ leaderboardMode: 'TARGET_PERCENT' });

    const data = await service.getMyPerformance(USER, own, new Set(), NOW);

    expect(data.rank).toMatchObject({
      period: '2026-11',
      mode: 'TARGET_PERCENT',
      participants: 2,
      meHasNoTarget: false,
      top: [
        {
          rank: 1,
          userId: 'agent-1',
          name: 'Mona',
          isMe: true,
          targetPercent: 120,
        },
        // Karim opted out: no id, no name.
        {
          rank: 2,
          userId: null,
          name: null,
          anonymous: true,
          targetPercent: 50,
        },
      ],
      me: { rank: 1, targetPercent: 120 },
    });
    expect(JSON.stringify(data.rank)).not.toContain('20000000');
    expect(JSON.stringify(data.rank)).not.toContain('revenue');
  });

  it('praises recent badges, leaving out money badges unless figures are shown', async () => {
    const percent = await build({
      leaderboardMode: 'TARGET_PERCENT',
    }).service.getMyPerformance(USER, own, new Set(), NOW);
    expect(percent.rank?.recentWins).toEqual([
      {
        badgeName: 'Deal maker',
        levelLabel: expect.any(String),
        unlockedAt: '2026-11-14T10:00:00.000Z',
        // Same level, one line.
        people: [
          { userId: 'agent-1', name: 'Mona', isMe: true },
          { userId: 'agent-3', name: 'Salma', isMe: false },
        ],
        others: 0,
      },
    ]);

    const full = await build({
      leaderboardMode: 'FULL',
    }).service.getMyPerformance(USER, own, new Set(), NOW);
    expect(full.rank?.recentWins.map((win) => win.badgeName)).toEqual([
      'Big seller',
      'Deal maker',
    ]);
    expect(full.rank?.top[0]).toMatchObject({
      name: null,
      revenue: 20_000_000,
    });
  });

  it('hides the leaderboard from agents when the workspace turned it off', async () => {
    const { service, actuals } = build({ leaderboardMode: 'OFF' });

    const data = await service.getMyPerformance(USER, own, new Set(), NOW);

    expect(data.rank).toBeNull();
    expect(actuals.compute).not.toHaveBeenCalled();
  });

  it('still shows team leads and managers the % of target when turned off', async () => {
    const { service } = build({ leaderboardMode: 'OFF' });
    const data = await service.getMyPerformance(USER, team, new Set(), NOW);
    expect(data.rank).toMatchObject({
      mode: 'TARGET_PERCENT',
      me: { rank: 1 },
    });
  });

  it('includes month vs target only with target.read', async () => {
    const { service, targets } = build();

    const without = await service.getMyPerformance(USER, own, new Set(), NOW);
    expect(without.month).toBeNull();
    expect(targets.getMine).not.toHaveBeenCalled();

    const withTargets = await service.getMyPerformance(
      USER,
      own,
      new Set(['target.read']),
      NOW,
    );
    expect(withTargets.month).toEqual({ period: '2026-11' });
    // Personal numbers only, never the workspace block.
    expect(targets.getMine).toHaveBeenCalledWith(
      USER,
      new Set(),
      '2026-11',
      NOW,
    );
  });

  it('survives a failed today refresh', async () => {
    const { service, dailyStats } = build();
    dailyStats.refreshToday.mockRejectedValue(new Error('redis down'));
    await expect(
      service.getMyPerformance(USER, own, new Set(), NOW),
    ).resolves.toMatchObject({ period: '2026-11' });
  });
});
