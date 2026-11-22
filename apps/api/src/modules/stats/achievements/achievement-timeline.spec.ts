import {
  ACHIEVEMENT_KEYS,
  getAchievement,
  type AchievementDefinition,
} from '@crmpro/shared/achievements';
import {
  badgeProgress,
  cumulative,
  evaluateBadge,
  ratio,
  reachedAt,
  readAt,
} from './achievement-timeline';

const NOW = new Date('2026-11-18T12:00:00Z');
const H48 = 48 * 60 * 60_000;
const DEALS = getAchievement(ACHIEVEMENT_KEYS.DEALS) as AchievementDefinition;
const CLOSER = getAchievement(ACHIEVEMENT_KEYS.CLOSER) as AchievementDefinition;

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

describe('readAt / reachedAt', () => {
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
    expect(reachedAt(timeline, 10_000_000)).toEqual(daysAgo(1));
    expect(reachedAt(timeline, 50_000_000)).toBeNull();
  });

  it('reads a rate in % with its sample, and has no "reached at" for rates', () => {
    const timeline = ratio([
      { at: daysAgo(3), success: true },
      { at: daysAgo(2), success: false },
      { at: daysAgo(1), success: false },
    ]);
    expect(readAt(timeline, NOW)).toEqual({ value: 33.3, sample: 3 });
    expect(readAt(timeline, daysAgo(2.5))).toEqual({ value: 100, sample: 1 });
    expect(reachedAt(timeline, 25)).toBeNull();
  });
});

describe('evaluateBadge', () => {
  const evaluate = (
    timeline: ReturnType<typeof cumulative> | ReturnType<typeof ratio>,
    unlocked: number[] = [],
    definition = DEALS,
  ) =>
    evaluateBadge({
      definition,
      timeline,
      unlockedLevels: new Set(unlocked),
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

  it('rates need the minimum sample, and are stamped now', () => {
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
      { level: 1, value: 25, unlockedAt: NOW },
    ]);
    // 48h ago the sample was 19: below the minimum, so it is news.
    expect(enough.notifyLevel?.level).toBe(1);
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
