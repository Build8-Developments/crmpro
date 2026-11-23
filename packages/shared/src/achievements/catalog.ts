/**
 * Badge catalog for "My performance" (workflow spec §4.1, §2.9). Shared by the
 * API (which computes each metric and stores `UserAchievement` rows per
 * reached level) and the web (which renders the badges).
 *
 * A badge has one metric and one or more levels. A level is reached when the
 * metric is at or above its threshold (and, for rates, when the sample is big
 * enough). Levels are 1-based and ordered by threshold.
 */

export const ACHIEVEMENT_KEYS = {
  DEALS: 'deals',
  REVENUE: 'revenue',
  SPEED_DEMON: 'speed_demon',
  ZERO_OVERDUE_WEEK: 'zero_overdue_week',
  STREAK: 'streak',
  REFERRAL_MAGNET: 'referral_magnet',
  CLOSER: 'closer',
} as const;

export type AchievementKey =
  (typeof ACHIEVEMENT_KEYS)[keyof typeof ACHIEVEMENT_KEYS];

/** How the metric value reads: a count, money (workspace currency) or a %. */
export type AchievementUnit = 'count' | 'money' | 'percent';

export interface AchievementLevel {
  /** 1-based. */
  level: number;
  /** The metric value needed (money in the workspace currency, % as 0–100). */
  threshold: number;
  label: string;
}

export interface AchievementDefinition {
  key: AchievementKey;
  name: string;
  /** One sentence: what earns it, in plain words. */
  description: string;
  /** What the value counts ("deals", "leads"), for "12 / 25 deals". */
  unitLabel: string;
  unit: AchievementUnit;
  levels: readonly AchievementLevel[];
  /**
   * Rates only: the metric counts once the sample (e.g. closed leads) is at
   * least this big.
   */
  minSample?: number;
  /** What the sample counts ("closed leads"). */
  sampleLabel?: string;
}

/** "Reached fast": first contact within this many working minutes. */
export const FAST_FIRST_CONTACT_MINUTES = 5;

/** Closer: the win rate counts over at least this many closed leads. */
export const CLOSER_MIN_CLOSED_LEADS = 20;

/**
 * A lead source is a client referral when a word of its name starts with one
 * of these (case-insensitive): "Referral", "Client referrals", "Referred by a
 * friend" — but not "Preferred partners". Sources are tenant-named, so this
 * is a naming convention.
 */
export const REFERRAL_SOURCE_KEYWORDS: readonly string[] = [
  'referral',
  'referred',
];

export function isReferralSourceName(
  name: string | null | undefined,
): boolean {
  if (!name) return false;
  const words = name.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return words.some((word) =>
    REFERRAL_SOURCE_KEYWORDS.some((keyword) => word.startsWith(keyword)),
  );
}

function levels(
  entries: ReadonlyArray<readonly [number, string]>,
): AchievementLevel[] {
  return entries.map(([threshold, label], index) => ({
    level: index + 1,
    threshold,
    label,
  }));
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    key: ACHIEVEMENT_KEYS.DEALS,
    name: 'Deal maker',
    description: 'Deals you closed (reserved or contracted, not cancelled).',
    unitLabel: 'deals',
    unit: 'count',
    levels: levels([
      [1, 'First deal'],
      [5, '5 deals'],
      [10, '10 deals'],
      [25, '25 deals'],
      [50, '50 deals'],
    ]),
  },
  {
    key: ACHIEVEMENT_KEYS.REVENUE,
    name: 'Big seller',
    description: 'Total price of your contracted deals.',
    unitLabel: 'sold',
    unit: 'money',
    levels: levels([
      [10_000_000, '10M sold'],
      [50_000_000, '50M sold'],
      [100_000_000, '100M sold'],
    ]),
  },
  {
    key: ACHIEVEMENT_KEYS.SPEED_DEMON,
    name: 'Speed demon',
    description: `New leads you first contacted within ${FAST_FIRST_CONTACT_MINUTES} working minutes of getting them.`,
    unitLabel: 'leads',
    unit: 'count',
    levels: levels([
      [10, '10 fast replies'],
      [50, '50 fast replies'],
      [100, '100 fast replies'],
    ]),
  },
  {
    key: ACHIEVEMENT_KEYS.ZERO_OVERDUE_WEEK,
    name: 'Zero overdue week',
    description:
      'Full weeks with tasks due and nothing left overdue at the end of any day.',
    unitLabel: 'weeks',
    unit: 'count',
    levels: levels([
      [1, 'First clean week'],
      [4, '4 clean weeks'],
      [12, '12 clean weeks'],
    ]),
  },
  {
    key: ACHIEVEMENT_KEYS.STREAK,
    name: 'On a roll',
    description:
      'Your longest streak of working days with at least 80% of the plan done.',
    unitLabel: 'days',
    unit: 'count',
    levels: levels([
      [5, '5-day streak'],
      [10, '10-day streak'],
      [20, '20-day streak'],
    ]),
  },
  {
    key: ACHIEVEMENT_KEYS.REFERRAL_MAGNET,
    name: 'Referral magnet',
    description: 'Deals on leads that came from a client referral.',
    unitLabel: 'referral deals',
    unit: 'count',
    levels: levels([
      [3, '3 referral deals'],
      [10, '10 referral deals'],
    ]),
  },
  {
    key: ACHIEVEMENT_KEYS.CLOSER,
    name: 'Closer',
    description: `Win rate of your leads, once at least ${CLOSER_MIN_CLOSED_LEADS} of them are closed (won or lost).`,
    unitLabel: 'win rate',
    unit: 'percent',
    levels: levels([[25, '25% win rate']]),
    minSample: CLOSER_MIN_CLOSED_LEADS,
    sampleLabel: 'closed leads',
  },
];

const BY_KEY = new Map<string, AchievementDefinition>(
  ACHIEVEMENTS.map((definition) => [definition.key, definition]),
);

export function getAchievement(
  key: string,
): AchievementDefinition | undefined {
  return BY_KEY.get(key);
}

export function getAchievementLevel(
  key: string,
  level: number,
): AchievementLevel | undefined {
  return BY_KEY.get(key)?.levels.find((entry) => entry.level === level);
}

/** A metric reading: the value and, for rates, the sample it is based on. */
export interface AchievementReading {
  value: number;
  sample: number | null;
}

/** True when `reading` meets the level (threshold and minimum sample). */
export function isLevelReached(
  definition: AchievementDefinition,
  level: AchievementLevel,
  reading: AchievementReading,
): boolean {
  if (
    definition.minSample !== undefined &&
    (reading.sample ?? 0) < definition.minSample
  ) {
    return false;
  }
  return reading.value >= level.threshold;
}

/** Every level `reading` meets, lowest first. */
export function levelsReached(
  definition: AchievementDefinition,
  reading: AchievementReading,
): AchievementLevel[] {
  return definition.levels.filter((level) =>
    isLevelReached(definition, level, reading),
  );
}
