import type { IntCounterKey } from './utils/daily-counters';

/** Additive counters with money as numbers (workspace currency). */
export type StatCounters = Record<IntCounterKey, number> & {
  revenue: number;
  commission: number;
};

/** Counters summed over a range, plus the averages they make possible. */
export type StatTotals = StatCounters & {
  /** firstResponseMinutesTotal / firstResponseCount (working minutes). */
  avgFirstResponseMinutes: number | null;
  /** slaHits / (slaHits + slaMisses), 0..1. */
  slaHitRate: number | null;
};

export interface DailyStatRow extends StatCounters {
  /** Local day (workspace time zone), YYYY-MM-DD. */
  day: string;
  userId: string;
  computedAt: string;
}

export interface DailyStatsResponse {
  from: string;
  to: string;
  timeZone: string;
  rows: DailyStatRow[];
  totals: StatTotals;
  users: Array<{ id: string; name: string; teamId: string | null }>;
}

export interface PeriodSummary {
  /** First local day of the period; null for all-time. */
  from: string | null;
  to: string;
  totals: StatTotals;
}

export interface MyStatsSummaryResponse {
  timeZone: string;
  today: PeriodSummary;
  week: PeriodSummary;
  month: PeriodSummary;
  allTime: PeriodSummary;
  streak: {
    days: number;
    /** Human-readable rule, so the UI can explain the number. */
    rule: string;
  };
  /** When the caller's today row was last computed (null: no row). */
  todayComputedAt: string | null;
}
