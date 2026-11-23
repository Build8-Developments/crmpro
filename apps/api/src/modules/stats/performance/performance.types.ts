import type {
  AchievementKey,
  AchievementUnit,
} from '@crmpro/shared/achievements';
import type { MyTargetsResponse } from '../../targets/targets.types';

export interface MonthPoint {
  /** YYYY-MM in the workspace time zone. */
  period: string;
  /** Deals reserved in the month (not cancelled). */
  deals: number;
  /** Price of deals contracted in the month (not cancelled). */
  revenue: number;
}

export interface PeriodBest {
  period: string;
  value: number;
}

export interface BadgeLevelView {
  level: number;
  threshold: number;
  label: string;
  /** ISO time; null while locked. */
  unlockedAt: string | null;
}

export interface BadgeView {
  key: AchievementKey;
  name: string;
  description: string;
  unit: AchievementUnit;
  unitLabel: string;
  /** Current metric value (money in the workspace currency, % as 0–100). */
  value: number;
  /** Rates: the sample the value is based on; null otherwise. */
  sample: number | null;
  minSample: number | null;
  sampleLabel: string | null;
  /** Highest unlocked level (0: none). */
  currentLevel: number;
  levels: BadgeLevelView[];
  next: {
    level: number;
    threshold: number;
    label: string;
    /** 0–1. */
    progress: number;
    remaining: number;
    /** True when the sample (e.g. closed leads) is what is missing. */
    needsSample: boolean;
  } | null;
}

/** What agents see about each other (TenantSettings.leaderboardMode, minus OFF). */
export type VisibleLeaderboardMode = 'RANK_ONLY' | 'TARGET_PERCENT' | 'FULL';

/**
 * One row. Only the fields the mode allows are sent: other people's money
 * never leaves the API unless the workspace chose FULL.
 */
export interface LeaderboardEntry {
  /** 1-based; equal scores share a rank. */
  rank: number;
  /** Null for someone who chose to appear as "A teammate". */
  userId: string | null;
  name: string | null;
  anonymous: boolean;
  isMe: boolean;
  /** TARGET_PERCENT (and the caller's own row in every mode): average % of own targets reached. */
  targetPercent?: number;
  /** FULL only: contracted revenue this month. */
  revenue?: number;
  /** FULL only: deals reserved this month. */
  deals?: number;
}

/**
 * A badge level people unlocked lately — praise without numbers. Everyone
 * who reached the same level is one line ("Mona, Omar and 3 others").
 */
export interface RecentWin {
  badgeName: string;
  levelLabel: string;
  /** Latest unlock among them (ISO). */
  unlockedAt: string;
  /** Up to RECENT_WIN_NAMES people, latest first; the caller as isMe. */
  people: Array<{ userId: string; name: string; isMe: boolean }>;
  /** How many more reached it. */
  others: number;
}

export interface LeaderboardView {
  period: string;
  mode: VisibleLeaderboardMode;
  /** People in the ranking (with targets this month, except in FULL). */
  participants: number;
  /** Up to 3 people with a score above zero. */
  top: LeaderboardEntry[];
  /** The caller; null when they can't record deals or have no target. */
  me: LeaderboardEntry | null;
  /** True when the caller could be ranked but has no target this month. */
  meHasNoTarget: boolean;
  recentWins: RecentWin[];
}

export interface MyPerformanceResponse {
  timeZone: string;
  currency: string;
  /** Current month, YYYY-MM. */
  period: string;
  allTime: {
    /** Deals credited to the user, not cancelled. */
    deals: number;
    /** One unit per deal (a deal is one unit). */
    units: number;
    /** Price of contracted deals. */
    revenue: number;
    /** Commission of contracted deals. */
    commission: number;
    interactions: number;
    visits: number;
    /** Distinct clients (leads) the user logged an interaction with. */
    clientsServed: number;
    /** When the user joined the workspace (ISO). */
    since: string;
  };
  /** Targets vs actuals this month; null without target.read. */
  month: MyTargetsResponse | null;
  /** The last 12 months, oldest first, current month last. */
  months: MonthPoint[];
  bests: {
    bestRevenueMonth: PeriodBest | null;
    bestDealsMonth: PeriodBest | null;
    fastContactStreak: {
      best: number;
      current: number;
      /** Working minutes that count as fast. */
      minutes: number;
      rule: string;
    };
    mostVisitsWeek: { weekStart: string; value: number } | null;
  };
  badges: BadgeView[];
  /** Null when hidden (see effectiveLeaderboardMode). */
  rank: LeaderboardView | null;
}
