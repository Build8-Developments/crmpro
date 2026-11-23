import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { DealFact, LeadFact } from '../achievements/achievement-sources';
import { TargetMetric } from '@crmpro/database';
import {
  bestMonth,
  effectiveLeaderboardMode,
  fastContactStreak,
  monthlySeries,
  mostVisitsInWeek,
  rankLeaderboard,
  targetAttainment,
} from './performance.utils';

const TZ = 'Africa/Cairo';
const NOW = new Date('2026-11-18T12:00:00Z');

function deal(patch: Partial<DealFact>): DealFact {
  return {
    reservedAt: new Date('2026-11-02T10:00:00Z'),
    contractedAt: null,
    price: 0,
    commission: 0,
    sourceName: null,
    ...patch,
  };
}

describe('monthlySeries / bestMonth', () => {
  const deals = [
    // Reserved Oct 31 23:30 Cairo (UTC 21:30) → October; contracted Nov 3.
    deal({
      reservedAt: new Date('2026-10-31T21:30:00Z'),
      contractedAt: new Date('2026-11-03T10:00:00Z'),
      price: 4_000_000,
    }),
    deal({ reservedAt: new Date('2026-11-05T10:00:00Z') }),
    deal({ reservedAt: new Date('2026-11-06T10:00:00Z') }),
    deal({
      reservedAt: new Date('2026-09-10T10:00:00Z'),
      contractedAt: new Date('2026-09-20T10:00:00Z'),
      price: 6_500_000,
    }),
  ];

  it('puts deals in their reservation month and revenue in the contract month (local time)', () => {
    expect(monthlySeries(deals, ['2026-09', '2026-10', '2026-11'], TZ)).toEqual(
      [
        { period: '2026-09', deals: 1, revenue: 6_500_000 },
        { period: '2026-10', deals: 1, revenue: 0 },
        { period: '2026-11', deals: 2, revenue: 4_000_000 },
      ],
    );
  });

  it('finds the best month ever per metric', () => {
    expect(bestMonth(deals, 'revenue', TZ)).toEqual({
      period: '2026-09',
      value: 6_500_000,
    });
    expect(bestMonth(deals, 'deals', TZ)).toEqual({
      period: '2026-11',
      value: 2,
    });
    expect(bestMonth([], 'deals', TZ)).toBeNull();
  });
});

describe('fastContactStreak', () => {
  // Tue 2026-11-17, 11:00 Cairo, + n minutes.
  const at = (minutes: number) => new Date(Date.UTC(2026, 10, 17, 9, minutes));
  const lead = (
    assigned: number,
    contacted: number | null,
    patch: Partial<LeadFact> = {},
  ): LeadFact => ({
    assignedAt: at(assigned),
    firstContactedAt: contacted === null ? null : at(contacted),
    closedAt: null,
    closeType: null,
    ...patch,
  });

  it('counts consecutive fast first contacts, in assignment order', () => {
    const result = fastContactStreak(
      [
        lead(0, 2),
        lead(10, 12),
        lead(20, 40), // slow: ends the run of 2
        lead(50, 51),
        lead(60, 61),
        lead(70, 72),
        lead(80, null), // never reached: ends the run of 3
        lead(90, 91),
      ],
      DEFAULT_WORK_SCHEDULE,
      NOW,
    );
    expect(result).toEqual({ best: 3, current: 1 });
  });

  it('skips leads still inside their window and leads touched before assignment', () => {
    const now = at(102);
    const result = fastContactStreak(
      [
        lead(0, 1),
        lead(10, 11, { firstContactedAt: at(-500) }),
        lead(100, null), // 2 minutes old: pending
      ],
      DEFAULT_WORK_SCHEDULE,
      now,
    );
    expect(result).toEqual({ best: 1, current: 1 });
  });
});

describe('mostVisitsInWeek', () => {
  it('groups visits by workspace week (Saturday start)', () => {
    const visits = [
      new Date('2026-11-14T10:00:00Z'), // Sat
      new Date('2026-11-16T10:00:00Z'), // Mon, same week
      new Date('2026-11-13T21:30:00Z'), // Fri 23:30 Cairo → week of Nov 7
    ];
    expect(mostVisitsInWeek(visits, TZ, 6)).toEqual({
      weekStart: '2026-11-14',
      value: 2,
    });
    expect(mostVisitsInWeek([], TZ, 6)).toBeNull();
  });
});

describe('effectiveLeaderboardMode', () => {
  it('follows the workspace setting for agents', () => {
    expect(effectiveLeaderboardMode('TARGET_PERCENT', { kind: 'own' })).toBe(
      'TARGET_PERCENT',
    );
    expect(effectiveLeaderboardMode('FULL', { kind: 'own' })).toBe('FULL');
    expect(effectiveLeaderboardMode('OFF', { kind: 'own' })).toBeNull();
  });

  it('still shows managers the % of target when it is off for agents', () => {
    expect(effectiveLeaderboardMode('OFF', { kind: 'team' })).toBe(
      'TARGET_PERCENT',
    );
    expect(effectiveLeaderboardMode('RANK_ONLY', { kind: 'all' })).toBe(
      'RANK_ONLY',
    );
  });
});

describe('targetAttainment', () => {
  it('averages the share of each target reached, capping each at 150%', () => {
    expect(
      targetAttainment(
        [
          { metric: TargetMetric.DEALS, value: 4 },
          { metric: TargetMetric.REVENUE, value: 10_000_000 },
        ],
        { [TargetMetric.DEALS]: 2, [TargetMetric.REVENUE]: 40_000_000 },
      ),
    ).toBe(100); // (50% + capped 150%) / 2
  });

  it('is null without targets, and ignores zero targets', () => {
    expect(targetAttainment([], { [TargetMetric.DEALS]: 3 })).toBeNull();
    expect(
      targetAttainment([{ metric: TargetMetric.DEALS, value: 0 }], undefined),
    ).toBeNull();
    expect(
      targetAttainment([{ metric: TargetMetric.VISITS, value: 4 }], undefined),
    ).toBe(0);
  });
});

describe('rankLeaderboard', () => {
  const person = (
    userId: string,
    name: string,
    revenue: number,
    deals: number,
    targetPercent: number | null,
    showOnLeaderboard = true,
  ) => ({ userId, name, revenue, deals, targetPercent, showOnLeaderboard });

  const people = [
    person('a', 'Amr', 5_000_000, 1, 60),
    person('b', 'Basma', 9_000_000, 2, 80),
    person('c', 'Chris', 5_000_000, 3, 120),
    person('d', 'Dina', 5_000_000, 3, 120, false),
    person('e', 'Emad', 1_000_000, 1, null),
    person('me', 'Me', 0, 0, 0),
  ];

  it('ranks by % of target, sends no money, ties share a rank', () => {
    const result = rankLeaderboard(people, 'me', 'TARGET_PERCENT');

    // Emad has no target: not ranked.
    expect(result.participants).toBe(5);
    expect(result.top).toEqual([
      {
        rank: 1,
        userId: 'c',
        name: 'Chris',
        anonymous: false,
        isMe: false,
        targetPercent: 120,
      },
      {
        rank: 1,
        userId: null,
        name: null,
        anonymous: true,
        isMe: false,
        targetPercent: 120,
      },
      {
        rank: 3,
        userId: 'b',
        name: 'Basma',
        anonymous: false,
        isMe: false,
        targetPercent: 80,
      },
    ]);
    for (const entry of result.top) {
      expect(entry).not.toHaveProperty('revenue');
      expect(entry).not.toHaveProperty('deals');
    }
    expect(result.me).toMatchObject({ rank: 5, isMe: true, targetPercent: 0 });
    expect(result.meHasNoTarget).toBe(false);
  });

  it('in RANK_ONLY sends only positions and names (your own % stays yours)', () => {
    const result = rankLeaderboard(people, 'c', 'RANK_ONLY');

    expect(result.top[0]).toEqual({
      rank: 1,
      userId: 'c',
      name: 'Chris',
      anonymous: false,
      isMe: true,
      targetPercent: 120,
    });
    expect(result.top[1]).not.toHaveProperty('targetPercent');
    expect(result.top[2]).not.toHaveProperty('targetPercent');
  });

  it('in FULL ranks everyone by revenue then deals and sends the figures', () => {
    const result = rankLeaderboard(people, 'me', 'FULL');

    expect(result.participants).toBe(6);
    expect(
      result.top.map((entry) => [entry.rank, entry.name, entry.revenue]),
    ).toEqual([
      [1, 'Basma', 9_000_000],
      [2, 'Chris', 5_000_000],
      [2, null, 5_000_000],
    ]);
  });

  it('shows an opted-out caller their own name, and flags a missing target', () => {
    expect(rankLeaderboard(people, 'd', 'TARGET_PERCENT').me).toMatchObject({
      userId: 'd',
      name: 'Dina',
      anonymous: false,
    });
    const noTarget = rankLeaderboard(people, 'e', 'TARGET_PERCENT');
    expect(noTarget.me).toBeNull();
    expect(noTarget.meHasNoTarget).toBe(true);
    expect(rankLeaderboard(people, 'stranger', 'TARGET_PERCENT').me).toBeNull();
  });
});
