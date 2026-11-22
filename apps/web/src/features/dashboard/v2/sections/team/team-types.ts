import type { DashboardPeriod } from "@/features/dashboard/v2/period";
import type { TargetMetric } from "@/features/targets/types";

/** Mirrors apps/api/.../dashboard-v2/dashboard-team.types.ts. */
export interface TeamMemberTarget {
  metric: TargetMetric;
  target: number;
  actual: number;
  percent: number;
}

export interface TeamMember {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
  interactionsToday: number;
  interactionsThisWeek: number;
  interactions: number;
  taskCompletionPct: number | null;
  tasksDue: number;
  tasksDone: number;
  overdueNow: number;
  slaCompliancePct: number | null;
  slaHits: number;
  slaMisses: number;
  medianFirstResponseMinutes: number | null;
  firstResponseSamples: number;
  visits: number;
  deals: number;
  revenue: number;
  targetPercent: number | null;
  targetMetric: TargetMetric | null;
  targets: TeamMemberTarget[];
}

export type TeamTotals = Omit<
  TeamMember,
  "id" | "name" | "team" | "targetPercent" | "targetMetric" | "targets"
>;

export interface TeamHeatmapCell {
  /** 0 = Sunday … 6 = Saturday (workspace time zone). */
  weekday: number;
  hour: number;
  count: number;
}

export interface DashboardTeam {
  period: { key: DashboardPeriod; from: string; to: string; timeZone: string };
  currency: string;
  weekStartsOn: number;
  statsComputedAt: string | null;
  members: TeamMember[];
  totals: TeamTotals;
  heatmap: { cells: TeamHeatmapCell[]; max: number; total: number };
}

/** Leads list filtered by owner (and optionally overdue next step). */
export function teamLeadsHref(userId: string, nextStep?: "overdue"): string {
  const params = new URLSearchParams({ assignees: userId });
  if (nextStep) params.set("nextStep", nextStep);
  return `/leads?${params.toString()}`;
}

/** "45m", "2h 10m", "—". */
export function formatMinutes(value: number | null): string {
  if (value === null) return "—";
  if (value < 60) return `${Math.round(value)}m`;
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** "82%", "—". */
export function formatPct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}
