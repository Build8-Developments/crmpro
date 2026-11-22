import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { DealFact, LeadFact } from '../achievements/achievement-sources';
import {
  bestMonth,
  canSeeLeaderboard,
  fastContactStreak,
  monthlySeries,
  mostVisitsInWeek,
  rankLeaderboard,
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

describe('canSeeLeaderboard', () => {
  it('shows agents the rank only when the workspace allows it', () => {
    expect(canSeeLeaderboard(true, { kind: 'own' })).toBe(true);
    expect(canSeeLeaderboard(false, { kind: 'own' })).toBe(false);
  });

  it('always shows it to people who read team or all leads', () => {
    expect(canSeeLeaderboard(false, { kind: 'team' })).toBe(true);
    expect(canSeeLeaderboard(false, { kind: 'all' })).toBe(true);
  });
});

describe('rankLeaderboard', () => {
  const people = [
    { userId: 'a', name: 'Amr', revenue: 5_000_000, deals: 1 },
    { userId: 'b', name: 'Basma', revenue: 9_000_000, deals: 2 },
    { userId: 'c', name: 'Chris', revenue: 5_000_000, deals: 3 },
    { userId: 'd', name: 'Dina', revenue: 5_000_000, deals: 3 },
    { userId: 'me', name: 'Me', revenue: 0, deals: 0 },
  ];

  it('ranks by revenue then deals, ties share a rank, top lists sellers only', () => {
    const result = rankLeaderboard(people, 'me');

    expect(result.participants).toBe(5);
    expect(result.top.map((entry) => [entry.rank, entry.userId])).toEqual([
      [1, 'b'],
      [2, 'c'],
      [2, 'd'],
    ]);
    expect(result.me).toMatchObject({ rank: 5, isMe: true, revenue: 0 });
  });

  it('flags the caller inside the top and returns null when not ranked', () => {
    expect(rankLeaderboard(people, 'b').top[0].isMe).toBe(true);
    expect(rankLeaderboard(people, 'stranger').me).toBeNull();
  });
});
