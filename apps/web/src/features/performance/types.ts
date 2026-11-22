import type { AchievementKey, AchievementUnit } from "@crmpro/shared/achievements";
import type { MyTargets } from "@/features/targets/types";

/** `GET /stats/me/performance` (workflow spec §4.1). */

export interface MonthPoint {
  /** YYYY-MM in the workspace time zone. */
  period: string;
  deals: number;
  revenue: number;
}

export interface PeriodBest {
  period: string;
  value: number;
}

export interface BadgeLevel {
  level: number;
  threshold: number;
  label: string;
  unlockedAt: string | null;
}

export interface Badge {
  key: AchievementKey;
  name: string;
  description: string;
  unit: AchievementUnit;
  unitLabel: string;
  value: number;
  sample: number | null;
  minSample: number | null;
  sampleLabel: string | null;
  currentLevel: number;
  levels: BadgeLevel[];
  next: {
    level: number;
    threshold: number;
    label: string;
    progress: number;
    remaining: number;
    needsSample: boolean;
  } | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  revenue: number;
  deals: number;
  isMe: boolean;
}

export interface Leaderboard {
  period: string;
  participants: number;
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface MyPerformance {
  timeZone: string;
  currency: string;
  period: string;
  allTime: {
    deals: number;
    units: number;
    revenue: number;
    commission: number;
    interactions: number;
    visits: number;
    clientsServed: number;
    since: string;
  };
  month: MyTargets | null;
  months: MonthPoint[];
  bests: {
    bestRevenueMonth: PeriodBest | null;
    bestDealsMonth: PeriodBest | null;
    fastContactStreak: { best: number; current: number; minutes: number; rule: string };
    mostVisitsWeek: { weekStart: string; value: number } | null;
  };
  badges: Badge[];
  rank: Leaderboard | null;
}
