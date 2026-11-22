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

export interface LeaderboardEntry {
  /** 1-based; equal numbers share a rank. */
  rank: number;
  userId: string;
  name: string;
  revenue: number;
  deals: number;
  isMe: boolean;
}

export interface LeaderboardView {
  period: string;
  /** Active people who can record deals. */
  participants: number;
  /** Up to 3, people with at least one sale or deal this month. */
  top: LeaderboardEntry[];
  /** The caller; null when the caller cannot record deals. */
  me: LeaderboardEntry | null;
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
  /** Null when hidden (see canSeeLeaderboard). */
  rank: LeaderboardView | null;
}
