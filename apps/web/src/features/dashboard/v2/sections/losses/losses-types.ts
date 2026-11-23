import type { PipelineAnalyticsData } from "@/features/dashboard/types";
import type { DashboardPeriod } from "@/features/dashboard/v2/period";

/** Mirrors apps/api/.../dashboard-v2/dashboard-losses.types.ts. */
export interface LossesStage {
  stageId: string;
  name: string;
  sortOrder: number;
  closeType: "WON" | null;
}

export interface ConversionCohort {
  month: string;
  leads: number;
  reached: Array<{
    stageId: string;
    count: number;
    percent: number | null;
    fromPrevious: number | null;
  }>;
}

export interface StageDuration {
  stageId: string;
  name: string;
  avgDays: number | null;
  medianDays: number | null;
  exits: number;
}

export interface LostReasonCount {
  reasonId: string | null;
  name: string;
  count: number;
  percent: number | null;
  recyclable: boolean;
}

export interface LostBreakdownRow {
  id: string | null;
  name: string;
  total: number;
  reasons: Array<{ reasonId: string | null; count: number }>;
}

export interface WonBackLead {
  leadId: string;
  name: string;
  lostAt: string;
  wonAt: string;
  lostReasonName: string | null;
  agent: { id: string; name: string } | null;
  viaReEngage: boolean;
}

export interface DashboardLosses {
  period: { key: DashboardPeriod; from: string; to: string; timeZone: string };
  pipeline: { id: string; name: string } | null;
  funnelStages: LossesStage[];
  cohorts: ConversionCohort[];
  stageDurations: StageDuration[];
  lost: {
    total: number;
    reasons: LostReasonCount[];
    bySource: LostBreakdownRow[];
    byAgent: LostBreakdownRow[];
  };
  wonBack: {
    count: number;
    viaReEngage: number;
    reEngageTasks: number;
    leads: WonBackLead[];
  };
  funnel: PipelineAnalyticsData;
}

/**
 * Leads lost for a reason in the period (closed between its bounds; the
 * list's `closedTo` is inclusive, the period's `to` exclusive). Null for
 * "No reason".
 */
export function lostReasonLeadsHref(
  reasonId: string | null,
  period: { from: string; to: string },
): string | null {
  if (!reasonId) return null;
  const query = new URLSearchParams({
    lostReasonId: reasonId,
    closedFrom: period.from,
    closedTo: new Date(Date.parse(period.to) - 1).toISOString(),
  });
  return `/leads?${query.toString()}`;
}

/** A stable chart colour per lost reason (by its rank in the breakdown). */
export function reasonColor(index: number): string {
  const base = `var(--chart-${(index % 5) + 1})`;
  // Past five reasons, reuse the palette lighter so neighbours stay distinct.
  return index < 5 ? base : `color-mix(in oklab, ${base} 50%, var(--muted))`;
}

export function formatShare(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}
