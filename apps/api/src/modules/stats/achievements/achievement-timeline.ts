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
 * When a running total first reached `threshold`; null when it has not, or
 * for rates (a rate can go down again, so only "now" is meaningful).
 */
export function reachedAt(
  timeline: MetricTimeline,
  threshold: number,
): Date | null {
  if (timeline.kind !== 'cumulative') return null;
  let value = 0;
  for (const event of timeline.events) {
    value += event.amount;
    if (value >= threshold) return event.at;
  }
  return null;
}

export interface UnlockedLevel {
  level: number;
  value: number;
  unlockedAt: Date;
}

export interface BadgeEvaluation {
  definition: AchievementDefinition;
  reading: AchievementReading;
  /** Levels reached now that had no row yet (to write), lowest first. */
  newLevels: UnlockedLevel[];
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
 */
export function evaluateBadge(params: {
  definition: AchievementDefinition;
  timeline: MetricTimeline;
  unlockedLevels: ReadonlySet<number>;
  now: Date;
  recentWindowMs: number;
}): BadgeEvaluation {
  const { definition, timeline, unlockedLevels, now } = params;
  const reading = readAt(timeline, now);
  const before = readAt(
    timeline,
    new Date(now.getTime() - params.recentWindowMs),
  );

  const newLevels: UnlockedLevel[] = [];
  let notifyLevel: AchievementLevel | null = null;
  for (const level of definition.levels) {
    if (unlockedLevels.has(level.level)) continue;
    if (!isLevelReached(definition, level, reading)) continue;
    const at = reachedAt(timeline, level.threshold);
    newLevels.push({
      level: level.level,
      value: reading.value,
      unlockedAt: at && at <= now ? at : now,
    });
    if (!isLevelReached(definition, level, before)) notifyLevel = level;
  }
  return { definition, reading, newLevels, notifyLevel };
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
