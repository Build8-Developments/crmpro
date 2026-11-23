import {
  ACHIEVEMENT_KEYS,
  getAchievement,
  type AchievementDefinition,
} from '@crmpro/shared/achievements';
import {
  badgeProgress,
  cumulative,
  evaluateBadge,
  firstReachedAt,
  type MetricTimeline,
  ratio,
  readAt,
} from './achievement-timeline';

const NOW = new Date('2026-11-18T12:00:00Z');
const H48 = 48 * 60 * 60_000;
const DEALS = getAchievement(ACHIEVEMENT_KEYS.DEALS) as AchievementDefinition;
const CLOSER = getAchievement(ACHIEVEMENT_KEYS.CLOSER) as AchievementDefinition;
const CLEAN_WEEKS = getAchievement(
  ACHIEVEMENT_KEYS.ZERO_OVERDUE_WEEK,
) as AchievementDefinition;
/** Levels 1, 2, 3 at 25 / 40 / 60 %, for a rate with more than one level. */
const MULTI_RATE: AchievementDefinition = {
  ...CLOSER,
  minSample: 4,
  levels: [
    { level: 1, threshold: 25, label: '25%' },
    { level: 2, threshold: 40, label: '40%' },
    { level: 3, threshold: 60, label: '60%' },
  ],
};

const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

/** `count` deals, one per day, the last one at `lastAt`. */
function deals(count: number, lastAt: Date) {
  return cumulative(
    Array.from({ length: count }, (_, index) => ({
      at: new Date(lastAt.getTime() - (count - 1 - index) * 86_400_000),
      amount: 1,
    })),
  );
}

const levelOf = (definition: AchievementDefinition, level: number) =>
  definition.levels[level - 1];

describe('readAt / firstReachedAt', () => {
  it('sums a running total up to the instant and finds when a threshold was hit', () => {
    const timeline = cumulative([
      { at: daysAgo(1), amount: 3_000_000 },
      { at: daysAgo(10), amount: 8_000_000 },
    ]);
    expect(readAt(timeline, NOW)).toEqual({ value: 11_000_000, sample: null });
    expect(readAt(timeline, daysAgo(5))).toEqual({
      value: 8_000_000,
      sample: null,
    });
    const revenue = getAchievement(
      ACHIEVEMENT_KEYS.REVENUE,
    ) as AchievementDefinition;
    expect(firstReachedAt(timeline, revenue, levelOf(revenue, 1), NOW)).toEqual(
      daysAgo(1),
    );
    expect(
      firstReachedAt(timeline, revenue, levelOf(revenue, 2), NOW),
    ).toBeNull();
    // Nothing after `until` counts.
    expect(
      firstReachedAt(timeline, revenue, levelOf(revenue, 1), daysAgo(2)),
    ).toBeNull();
  });

  it('reads a rate in % with its sample, and its first crossing', () => {
    const timeline = ratio([
      { at: daysAgo(3), success: true },
      { at: daysAgo(2), success: false },
      { at: daysAgo(1), success: false },
    ]);
    expect(readAt(timeline, NOW)).toEqual({ value: 33.3, sample: 3 });
    expect(readAt(timeline, daysAgo(2.5))).toEqual({ value: 100, sample: 1 });
    // CLOSER needs 20 closed leads: never met here.
    expect(
      firstReachedAt(timeline, CLOSER, levelOf(CLOSER, 1), NOW),
    ).toBeNull();
  });

  it('a rate counts as reached the first time it crossed, even if it dropped since', () => {
    const timeline = ratio([
      { at: daysAgo(1), success: false },
      { at: daysAgo(9), success: true },
      { at: daysAgo(8), success: true },
      { at: daysAgo(7), success: false },
      { at: daysAgo(6), success: false },
      { at: daysAgo(2), success: false },
    ]);
    // 4 closed 6 days ago: 50%. Now 2 / 6 = 33%.
    expect(
      firstReachedAt(timeline, MULTI_RATE, levelOf(MULTI_RATE, 2), NOW),
    ).toEqual(daysAgo(6));
    expect(readAt(timeline, NOW).value).toBe(33.3);
  });

  it('reads events at the same instant together', () => {
    const at = daysAgo(3);
    const timeline = ratio([
      { at, success: true },
      { at, success: true },
      { at, success: true },
      { at, success: false },
      { at, success: false },
      { at, success: false },
    ]);
    // Read one by one, 3 wins first would look like 75% at sample 4; read
    // together (as readAt does) it is 50% at sample 6.
    expect(
      firstReachedAt(timeline, MULTI_RATE, levelOf(MULTI_RATE, 3), NOW),
    ).toBeNull();
    expect(
      firstReachedAt(timeline, MULTI_RATE, levelOf(MULTI_RATE, 2), NOW),
    ).toEqual(at);
  });
});

describe('evaluateBadge', () => {
  /** `unlocked`: stored level numbers (dated now) or level → stored date. */
  const evaluate = (
    timeline: MetricTimeline,
    unlocked: number[] | Record<number, Date> = [],
    definition = DEALS,
  ) =>
    evaluateBadge({
      definition,
      timeline,
      unlocked: new Map(
        Array.isArray(unlocked)
          ? unlocked.map((level) => [level, { unlockedAt: NOW }])
          : Object.entries(unlocked).map(([level, unlockedAt]) => [
              Number(level),
              { unlockedAt },
            ]),
      ),
      now: NOW,
      recentWindowMs: H48,
    });

  it('unlocks every reached level with the day it was reached', () => {
    const result = evaluate(deals(6, daysAgo(1)));

    expect(result.reading.value).toBe(6);
    expect(result.newLevels).toEqual([
      { level: 1, value: 6, unlockedAt: daysAgo(6) },
      { level: 2, value: 6, unlockedAt: daysAgo(2) },
    ]);
  });

  it('first run on old history: writes the levels but does not notify', () => {
    // 30 deals, the last one 5 days ago: every level was reached > 48h ago.
    const result = evaluate(deals(30, daysAgo(5)));

    expect(result.newLevels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
    expect(result.notifyLevel).toBeNull();
  });

  it('notifies only the highest level crossed in the last 48 hours', () => {
    // 24 deals until yesterday-ish, the 25th and 26th within 48h.
    const timeline = cumulative([
      ...deals(24, daysAgo(5)).events,
      { at: hoursAgo(30), amount: 1 },
      { at: hoursAgo(2), amount: 1 },
    ]);

    const result = evaluate(timeline);

    expect(result.newLevels.map((level) => level.level)).toEqual([1, 2, 3, 4]);
    expect(result.notifyLevel?.label).toBe('25 deals');
  });

  it('notifies one level once: stored levels are neither rewritten nor announced', () => {
    const timeline = deals(5, hoursAgo(1));

    const first = evaluate(timeline);
    expect(first.newLevels.map((level) => level.level)).toEqual([1, 2]);
    expect(first.notifyLevel?.level).toBe(2);

    const second = evaluate(timeline, [1, 2]);
    expect(second.newLevels).toEqual([]);
    expect(second.notifyLevel).toBeNull();
  });

  it('never takes a level back when the metric drops', () => {
    // Stored level 1, but the only deal was cancelled (no events now).
    const result = evaluate(cumulative([]), [1]);
    expect(result.newLevels).toEqual([]);
    expect(badgeProgress(DEALS, result.reading, new Set([1]))).toMatchObject({
      currentLevel: 1,
      next: { level: 2, threshold: 5, progress: 0, remaining: 5 },
    });
  });

  it('rates need the minimum sample, and are stamped when first crossed', () => {
    const outcomes = (won: number, lost: number, at: Date) =>
      Array.from({ length: won + lost }, (_, index) => ({
        at,
        success: index < won,
      }));

    // 5 / 19 closed = 26%, but under the 20-lead minimum.
    const small = evaluate(ratio(outcomes(5, 14, daysAgo(10))), [], CLOSER);
    expect(small.newLevels).toEqual([]);

    // The 20th closed lead (lost, an hour ago) makes it 5 / 20 = 25%.
    const enough = evaluate(
      ratio([
        ...outcomes(5, 14, daysAgo(10)),
        { at: hoursAgo(1), success: false },
      ]),
      [],
      CLOSER,
    );
    expect(enough.reading).toEqual({ value: 25, sample: 20 });
    expect(enough.newLevels).toEqual([
      { level: 1, value: 25, unlockedAt: hoursAgo(1) },
    ]);
    // 48h ago the sample was 19: below the minimum, so it is news.
    expect(enough.notifyLevel?.level).toBe(1);
  });
});

describe('evaluateBadge: level dates stay in order', () => {
  const evaluate = (
    timeline: MetricTimeline,
    stored: Record<number, Date>,
    definition: AchievementDefinition,
  ) =>
    evaluateBadge({
      definition,
      timeline,
      unlocked: new Map(
        Object.entries(stored).map(([level, unlockedAt]) => [
          Number(level),
          { unlockedAt },
        ]),
      ),
      now: NOW,
      recentWindowMs: H48,
    });

  /** One clean week counted at each of these instants. */
  const weeks = (...ends: Date[]) =>
    cumulative(ends.map((at) => ({ at, amount: 1 })));

  /** Every unlocked level's date, stored (after repairs) or new. */
  function datesAfter(
    result: ReturnType<typeof evaluate>,
    stored: Record<number, Date>,
  ): Map<number, Date> {
    const dates = new Map(
      Object.entries(stored).map(([level, at]) => [Number(level), at]),
    );
    for (const repair of result.repairs) {
      dates.set(repair.level, repair.unlockedAt);
    }
    for (const level of result.newLevels) {
      dates.set(level.level, level.unlockedAt);
    }
    return dates;
  }

  function expectOrdered(dates: Map<number, Date>) {
    const levels = [...dates.keys()].sort((a, b) => a - b);
    for (let index = 1; index < levels.length; index += 1) {
      const lower = dates.get(levels[index - 1]) as Date;
      const higher = dates.get(levels[index]) as Date;
      expect(lower.getTime()).toBeLessThanOrEqual(higher.getTime());
    }
  }

  it('backfill: older history after level 1 was stored repairs level 1 and dates level 2 after it', () => {
    // Pass 1 (only recent daily stats): one clean week, ending 11 days ago.
    const first = evaluate(weeks(daysAgo(11)), {}, CLEAN_WEEKS);
    expect(first.newLevels).toEqual([
      { level: 1, value: 1, unlockedAt: daysAgo(11) },
    ]);
    const stored = { 1: daysAgo(11) };

    // Pass 2 (after the backfill): 5 clean weeks, the 4th 25 days ago.
    const history = weeks(
      daysAgo(81),
      daysAgo(46),
      daysAgo(39),
      daysAgo(25),
      daysAgo(11),
    );
    const second = evaluate(history, stored, CLEAN_WEEKS);

    expect(second.newLevels).toEqual([
      { level: 2, value: 5, unlockedAt: daysAgo(25) },
    ]);
    expect(second.repairs).toEqual([
      { level: 1, from: daysAgo(11), unlockedAt: daysAgo(81) },
    ]);
    // Old news: neither the repair nor level 2 is announced.
    expect(second.notifyLevel).toBeNull();
    expectOrdered(datesAfter(second, stored));
  });

  it('a stored lower level is never dated after a stored higher one', () => {
    // The demo case: level 1 stored after level 2 by different passes; the
    // history now read starts later than both (rows were re-backfilled).
    const stored = { 1: daysAgo(11), 2: daysAgo(25) };
    const result = evaluate(
      weeks(daysAgo(20), daysAgo(19), daysAgo(18), daysAgo(17), daysAgo(16)),
      stored,
      CLEAN_WEEKS,
    );

    // Level 1 moves to level 2's date; level 2 keeps its earlier date.
    expect(result.repairs).toEqual([
      { level: 1, from: daysAgo(11), unlockedAt: daysAgo(25) },
    ]);
    expect(result.newLevels).toEqual([]);
    expectOrdered(datesAfter(result, stored));
  });

  it('never moves a date later, and leaves correct rows alone', () => {
    // Stored earlier than the history now shows (e.g. rows were wiped).
    const stored = { 1: daysAgo(60), 2: daysAgo(30) };
    const result = evaluate(
      weeks(daysAgo(20), daysAgo(19), daysAgo(18), daysAgo(17)),
      stored,
      CLEAN_WEEKS,
    );
    expect(result.repairs).toEqual([]);
    expect(result.newLevels).toEqual([]);
  });

  it('a missing level below a stored one is written with the higher date, silently', () => {
    // Level 2 stored 30 days ago; the metric has dropped to 0 since.
    const stored = { 2: daysAgo(30) };
    const result = evaluate(cumulative([]), stored, CLEAN_WEEKS);

    expect(result.newLevels).toEqual([
      { level: 1, value: 0, unlockedAt: daysAgo(30) },
    ]);
    expect(result.notifyLevel).toBeNull();
  });

  it('a new lower level reached recently is not announced under a stored higher one', () => {
    const stored = { 2: daysAgo(30) };
    const result = evaluate(weeks(hoursAgo(5)), stored, CLEAN_WEEKS);

    expect(result.newLevels).toEqual([
      { level: 1, value: 1, unlockedAt: daysAgo(30) },
    ]);
    expect(result.notifyLevel).toBeNull();
  });

  it('rates: each level at its first crossing, capped by the higher ones', () => {
    const timeline = ratio([
      // 4 closed 10 days ago: 3 / 4 = 75% → every level.
      { at: daysAgo(10), success: true },
      { at: daysAgo(10), success: true },
      { at: daysAgo(10), success: true },
      { at: daysAgo(10), success: false },
      // Drops to 3 / 7 = 43%: level 3 no longer met now.
      { at: daysAgo(3), success: false },
      { at: daysAgo(3), success: false },
      { at: daysAgo(3), success: false },
    ]);
    const result = evaluate(timeline, {}, MULTI_RATE);

    expect(result.reading).toEqual({ value: 42.9, sample: 7 });
    // Levels 1 and 2 are met now, first crossed 10 days ago; level 3 is not
    // met now, so it is not unlocked.
    expect(result.newLevels).toEqual([
      { level: 1, value: 42.9, unlockedAt: daysAgo(10) },
      { level: 2, value: 42.9, unlockedAt: daysAgo(10) },
    ]);
  });

  it('keeps every level in order whatever was stored before', () => {
    const history = weeks(
      ...Array.from({ length: 14 }, (_, index) => daysAgo(100 - index * 7)),
    );
    const storedCases: Array<Record<number, Date>> = [
      {},
      { 1: daysAgo(2) },
      { 2: daysAgo(50) },
      { 3: daysAgo(40) },
      { 1: daysAgo(5), 3: daysAgo(80) },
      { 1: daysAgo(3), 2: daysAgo(4), 3: daysAgo(5) },
      { 1: daysAgo(99), 2: daysAgo(98) },
    ];
    for (const stored of storedCases) {
      const result = evaluate(history, stored, CLEAN_WEEKS);
      const dates = datesAfter(result, stored);
      expect([...dates.keys()].sort()).toEqual([1, 2, 3]);
      expectOrdered(dates);
      for (const repair of result.repairs) {
        expect(repair.unlockedAt.getTime()).toBeLessThan(repair.from.getTime());
      }
    }
  });
});

describe('badgeProgress', () => {
  it('shows the sample as what is missing until a rate counts', () => {
    expect(badgeProgress(CLOSER, { value: 40, sample: 12 }, new Set())).toEqual(
      {
        currentLevel: 0,
        next: {
          level: 1,
          threshold: 25,
          label: '25% win rate',
          progress: 0.6,
          remaining: 8,
          needsSample: true,
        },
      },
    );
  });

  it('has no next level once every level is unlocked', () => {
    expect(
      badgeProgress(CLOSER, { value: 30, sample: 40 }, new Set([1])),
    ).toEqual({ currentLevel: 1, next: null });
  });
});
