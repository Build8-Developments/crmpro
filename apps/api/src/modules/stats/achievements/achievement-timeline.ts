import {
  type AchievementDefinition,
  type AchievementLevel,
  type AchievementReading,
  isLevelReached,
} from '@crmpro/shared/achievements';

/**
 * How a badge metric moved over time, so it can be read "now" and "48h ago"
 * (the notification rule) and so a level reached long ago is stored with the
 * day it was really reached. Pure: built from already-loaded records.
 */

export interface TimelineEvent {
  at: Date;
  amount: number;
}

/** A running total (deals, revenue, weeks…): the value at T sums events ≤ T. */
export interface CumulativeTimeline {
  kind: 'cumulative';
  events: TimelineEvent[];
}

/** A success rate in % over closed items (win rate). */
export interface RatioTimeline {
  kind: 'ratio';
  outcomes: Array<{ at: Date; success: boolean }>;
}

export type MetricTimeline = CumulativeTimeline | RatioTimeline;

export function cumulative(events: TimelineEvent[]): CumulativeTimeline {
  return {
    kind: 'cumulative',
    events: [...events].sort((a, b) => a.at.getTime() - b.at.getTime()),
  };
}

export function ratio(
  outcomes: Array<{ at: Date; success: boolean }>,
): RatioTimeline {
  return { kind: 'ratio', outcomes };
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** The metric as it stood at `at`. */
export function readAt(timeline: MetricTimeline, at: Date): AchievementReading {
  const time = at.getTime();
  if (timeline.kind === 'cumulative') {
    let value = 0;
    for (const event of timeline.events) {
      if (event.at.getTime() > time) break;
      value += event.amount;
    }
    return { value: roundTo(value, 2), sample: null };
  }
  let sample = 0;
  let successes = 0;
  for (const outcome of timeline.outcomes) {
    if (outcome.at.getTime() > time) continue;
    sample += 1;
    if (outcome.success) successes += 1;
  }
  return {
    value: sample > 0 ? roundTo((successes / sample) * 100, 1) : 0,
    sample,
  };
}

/**
 * The metric after each instant something changed, oldest first, up to
 * `until` (events at the same instant are read together, like readAt).
 */
function readingsUntil(
  timeline: MetricTimeline,
  until: Date,
): Array<{ at: Date; reading: AchievementReading }> {
  const limit = until.getTime();
  const points: Array<{ at: Date; reading: AchievementReading }> = [];
  if (timeline.kind === 'cumulative') {
    let value = 0;
    timeline.events.forEach((event, index) => {
      if (event.at.getTime() > limit) return;
      value += event.amount;
      const next = timeline.events[index + 1];
      if (next && next.at.getTime() === event.at.getTime()) return;
      points.push({
        at: event.at,
        reading: { value: roundTo(value, 2), sample: null },
      });
    });
    return points;
  }
  const outcomes = [...timeline.outcomes].sort(
    (a, b) => a.at.getTime() - b.at.getTime(),
  );
  let sample = 0;
  let successes = 0;
  outcomes.forEach((outcome, index) => {
    if (outcome.at.getTime() > limit) return;
    sample += 1;
    if (outcome.success) successes += 1;
    const next = outcomes[index + 1];
    if (next && next.at.getTime() === outcome.at.getTime()) return;
    points.push({
      at: outcome.at,
      reading: { value: roundTo((successes / sample) * 100, 1), sample },
    });
  });
  return points;
}

/**
 * The first instant (up to `until`) the metric met `level` — threshold and
 * minimum sample. For a metric that can drop again (a rate), this is the
 * first crossing, even if it is below the level now. Null when never met.
 */
export function firstReachedAt(
  timeline: MetricTimeline,
  definition: AchievementDefinition,
  level: AchievementLevel,
  until: Date,
): Date | null {
  const point = readingsUntil(timeline, until).find(({ reading }) =>
    isLevelReached(definition, level, reading),
  );
  return point?.at ?? null;
}

function earliest(...dates: Array<Date | null | undefined>): Date | null {
  let result: Date | null = null;
  for (const date of dates) {
    if (date && (!result || date < result)) result = date;
  }
  return result;
}

export interface UnlockedLevel {
  level: number;
  value: number;
  unlockedAt: Date;
}

/** A stored level whose date must move earlier. */
export interface LevelDateRepair {
  level: number;
  /** The stored (too late) date. */
  from: Date;
  unlockedAt: Date;
}

export interface BadgeEvaluation {
  definition: AchievementDefinition;
  reading: AchievementReading;
  /** Levels reached now that had no row yet (to write), lowest first. */
  newLevels: UnlockedLevel[];
  /**
   * Stored levels dated later than they were really reached (rows written by
   * an earlier pass over less history, e.g. before a daily-stats backfill),
   * lowest first. Dates only ever move earlier; never announced.
   */
  repairs: LevelDateRepair[];
  /**
   * The level to announce: the highest new level that was not reached
   * `recentWindowMs` ago. Null when every new level is old news (first run
   * on existing history) — those rows are written silently.
   */
  notifyLevel: AchievementLevel | null;
}

/**
 * Which levels of one badge become unlocked now, and whether to notify.
 * Never "un-earns": levels already stored stay, whatever the metric does.
 *
 * Dates are consistent across levels: a level is unlocked no later than the
 * first time it was crossed, and no later than any higher level (stored or
 * new). A level below an unlocked one counts as unlocked even if the metric
 * has dropped under it since.
 */
export function evaluateBadge(params: {
  definition: AchievementDefinition;
  timeline: MetricTimeline;
  /** Levels already stored, with their dates. */
  unlocked: ReadonlyMap<number, { unlockedAt: Date }>;
  now: Date;
  recentWindowMs: number;
}): BadgeEvaluation {
  const { definition, timeline, unlocked, now } = params;
  const reading = readAt(timeline, now);
  const before = readAt(
    timeline,
    new Date(now.getTime() - params.recentWindowMs),
  );
  const highestStored = Math.max(0, ...unlocked.keys());

  const newLevels: UnlockedLevel[] = [];
  const repairs: LevelDateRepair[] = [];
  let notifyLevel: AchievementLevel | null = null;
  // Highest level first, so each date is capped by the levels above it.
  let earliestAbove: Date | null = null;
  const descending = [...definition.levels].sort((a, b) => b.level - a.level);
  for (const level of descending) {
    const stored = unlocked.get(level.level)?.unlockedAt ?? null;
    const reachedNow = isLevelReached(definition, level, reading);
    if (!stored && !reachedNow && !earliestAbove) continue;

    const crossed = firstReachedAt(timeline, definition, level, now);
    const unlockedAt: Date = earliest(stored, crossed, earliestAbove) ?? now;
    earliestAbove = unlockedAt;

    if (stored) {
      if (unlockedAt < stored) {
        repairs.push({ level: level.level, from: stored, unlockedAt });
      }
      continue;
    }
    newLevels.push({ level: level.level, value: reading.value, unlockedAt });
    if (
      notifyLevel === null &&
      level.level > highestStored &&
      reachedNow &&
      !isLevelReached(definition, level, before)
    ) {
      notifyLevel = level;
    }
  }
  newLevels.reverse();
  repairs.reverse();
  return { definition, reading, newLevels, repairs, notifyLevel };
}

export interface BadgeProgress {
  /** Highest level unlocked (0: none). */
  currentLevel: number;
  next: {
    level: number;
    threshold: number;
    label: string;
    /** 0–1 toward the next level (for rates: the sample first, then the rate). */
    progress: number;
    /** What is still missing, in the badge's unit (or the sample's). */
    remaining: number;
    /** True when the sample is what is missing (rates). */
    needsSample: boolean;
  } | null;
}

/** Progress toward the first level not unlocked yet. */
export function badgeProgress(
  definition: AchievementDefinition,
  reading: AchievementReading,
  unlockedLevels: ReadonlySet<number>,
): BadgeProgress {
  const currentLevel = Math.max(0, ...unlockedLevels);
  const next = definition.levels.find(
    (level) => !unlockedLevels.has(level.level),
  );
  if (!next) return { currentLevel, next: null };

  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const sample = reading.sample ?? 0;
  if (definition.minSample !== undefined && sample < definition.minSample) {
    return {
      currentLevel,
      next: {
        level: next.level,
        threshold: next.threshold,
        label: next.label,
        progress: roundTo(clamp(sample / definition.minSample), 3),
        remaining: definition.minSample - sample,
        needsSample: true,
      },
    };
  }
  return {
    currentLevel,
    next: {
      level: next.level,
      threshold: next.threshold,
      label: next.label,
      progress: roundTo(
        next.threshold > 0 ? clamp(reading.value / next.threshold) : 1,
        3,
      ),
      remaining: roundTo(Math.max(0, next.threshold - reading.value), 2),
      needsSample: false,
    },
  };
}
