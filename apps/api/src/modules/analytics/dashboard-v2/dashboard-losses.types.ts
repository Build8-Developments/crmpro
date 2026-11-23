import type { PipelineAnalyticsData } from '../analytics.types';
import type { DashboardPeriodKey } from './dashboard-period';

export interface DashboardLossesStage {
  stageId: string;
  name: string;
  sortOrder: number;
  /** WON for the won step; open stages are null. */
  closeType: 'WON' | null;
}

export interface DashboardConversionCohort {
  /** Created month, "YYYY-MM" in the workspace time zone. */
  month: string;
  leads: number;
  /** One per funnel step (same order as `funnelStages`). */
  reached: Array<{
    stageId: string;
    count: number;
    /** count / cohort leads × 100. */
    percent: number | null;
    /** count / previous step's count × 100 (stage-to-stage conversion). */
    fromPrevious: number | null;
  }>;
}

export interface DashboardStageDuration {
  stageId: string;
  name: string;
  /** Average days of the stints that ended (left the stage) in the period. */
  avgDays: number | null;
  medianDays: number | null;
  /** Stints that ended in the period. */
  exits: number;
}

export interface DashboardLostReasonCount {
  /** Null for leads lost without a reason (before reasons were required). */
  reasonId: string | null;
  name: string;
  count: number;
  /** count / total lost × 100. */
  percent: number | null;
  recyclable: boolean;
}

export interface DashboardLostBreakdownRow {
  /** Source id or user id; null for "No source" / "Unassigned". */
  id: string | null;
  name: string;
  total: number;
  reasons: Array<{ reasonId: string | null; count: number }>;
}

export interface DashboardWonBackLead {
  leadId: string;
  name: string;
  lostAt: string;
  wonAt: string;
  lostReasonName: string | null;
  agent: { id: string; name: string } | null;
  /** A R12 "re-engage" task existed on the lead between the loss and the win. */
  viaReEngage: boolean;
}

export interface DashboardLossesResponse {
  period: {
    key: DashboardPeriodKey;
    from: string;
    to: string;
    timeZone: string;
  };
  pipeline: { id: string; name: string } | null;
  /** Funnel steps for the cohort table: open stages in order, then Won. */
  funnelStages: DashboardLossesStage[];
  cohorts: DashboardConversionCohort[];
  stageDurations: DashboardStageDuration[];
  lost: {
    total: number;
    reasons: DashboardLostReasonCount[];
    bySource: DashboardLostBreakdownRow[];
    byAgent: DashboardLostBreakdownRow[];
  };
  wonBack: {
    /** Leads won in the period that had been lost before. */
    count: number;
    /** …of which after a R12 re-engage task. */
    viaReEngage: number;
    /** Re-engage tasks created in the period (the pool being worked). */
    reEngageTasks: number;
    leads: DashboardWonBackLead[];
  };
  /** The current pipeline funnel (snapshot, not period-bound). */
  funnel: PipelineAnalyticsData;
}
