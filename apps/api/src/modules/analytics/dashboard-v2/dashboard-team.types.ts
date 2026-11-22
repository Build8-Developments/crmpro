import type { TargetMetric } from '@crmpro/database';
import type { DashboardPeriodKey } from './dashboard-period';

/** One metric of a person's target for the period (only metrics with a target). */
export interface DashboardTeamTarget {
  metric: TargetMetric;
  /** Target for the window: the month's target, or prorated for rolling windows. */
  target: number;
  actual: number;
  /** actual / target × 100, not capped. */
  percent: number;
}

export interface DashboardTeamMember {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
  interactionsToday: number;
  interactionsThisWeek: number;
  /** Interactions in the period (live, from the interactions table). */
  interactions: number;
  /** Tasks done / tasks due in the period (UserDailyStat), 0–100; null when nothing was due. */
  taskCompletionPct: number | null;
  tasksDue: number;
  tasksDone: number;
  /** Open tasks past their due time right now. */
  overdueNow: number;
  /** slaHits / (slaHits + slaMisses) in the period (UserDailyStat), 0–100; null without SLA leads. */
  slaCompliancePct: number | null;
  slaHits: number;
  slaMisses: number;
  /** Median working minutes from assignment to the assignee's first touch; null without samples. */
  medianFirstResponseMinutes: number | null;
  firstResponseSamples: number;
  visits: number;
  /** Deals reserved in the period and not cancelled (credited to the deal agent). */
  deals: number;
  /** Contracted revenue in the period (not cancelled). */
  revenue: number;
  /** Headline target %: deals if set, else revenue, else the first metric with a target. */
  targetPercent: number | null;
  targetMetric: TargetMetric | null;
  targets: DashboardTeamTarget[];
}

export interface DashboardTeamTotals {
  interactionsToday: number;
  interactionsThisWeek: number;
  interactions: number;
  tasksDue: number;
  tasksDone: number;
  taskCompletionPct: number | null;
  overdueNow: number;
  slaHits: number;
  slaMisses: number;
  slaCompliancePct: number | null;
  medianFirstResponseMinutes: number | null;
  firstResponseSamples: number;
  visits: number;
  deals: number;
  revenue: number;
}

export interface DashboardTeamHeatmapCell {
  /** 0 = Sunday … 6 = Saturday, in the workspace time zone. */
  weekday: number;
  /** 0–23, local hour. */
  hour: number;
  count: number;
}

export interface DashboardTeamResponse {
  period: {
    key: DashboardPeriodKey;
    from: string;
    to: string;
    timeZone: string;
  };
  currency: string;
  /** 0 = Sunday … 6 = Saturday; the heatmap starts its rows here. */
  weekStartsOn: number;
  /** Latest `UserDailyStat.computedAt` used (task / SLA figures); null when no rows yet. */
  statsComputedAt: string | null;
  members: DashboardTeamMember[];
  totals: DashboardTeamTotals;
  heatmap: {
    cells: DashboardTeamHeatmapCell[];
    max: number;
    total: number;
  };
}
