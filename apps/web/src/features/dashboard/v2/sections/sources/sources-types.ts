import type { DashboardPeriod } from "@/features/dashboard/v2/period";

/** Mirrors apps/api/.../dashboard-v2/dashboard-sources.types.ts. */
export interface SourceRow {
  sourceId: string | null;
  name: string;
  leads: number;
  contacted: number;
  contactRate: number | null;
  visited: number;
  visitRate: number | null;
  won: number;
  closed: number;
  winRate: number | null;
  deals: number;
  revenue: number;
  spend: number | null;
  costPerLead: number | null;
  costPerVisit: number | null;
  costPerDeal: number | null;
}

export interface ProjectDemandRow {
  projectId: string;
  name: string;
  developerName: string | null;
  interestedLeads: number;
  hotInterest: number;
  deals: number;
  revenue: number;
  conversionRate: number | null;
}

export interface DashboardSources {
  period: { key: DashboardPeriod; from: string; to: string; timeZone: string };
  currency: string;
  spendVisible: boolean;
  spendBasis: "full-month" | "prorated";
  sources: SourceRow[];
  totals: Omit<SourceRow, "sourceId" | "name">;
  projects: ProjectDemandRow[];
}

export type SourcesPeriodWindow = Pick<DashboardSources["period"], "from" | "to">;

/**
 * The row's cohort in the leads list: that source's leads created in the
 * period (same bounds as the count; the list's `createdTo` is inclusive, the
 * period's `to` exclusive). Null for "No source" — the list cannot filter
 * on a missing source.
 */
export function sourceLeadsHref(sourceId: string | null, period: SourcesPeriodWindow): string | null {
  if (!sourceId) return null;
  const params = new URLSearchParams({
    sourceIds: sourceId,
    createdFrom: period.from,
    createdTo: new Date(Date.parse(period.to) - 1).toISOString(),
  });
  return `/leads?${params.toString()}`;
}

/** Shown instead of a link on the "No source" row. */
export const NO_SOURCE_LINK_HINT = "Leads without a source can't be opened as a list";

/**
 * Every lead interested in the project. The list cannot filter on when the
 * interest was added, so it can hold more leads than the period's count.
 */
export function projectLeadsHref(projectId: string): string {
  return `/leads?projectId=${encodeURIComponent(projectId)}`;
}

export function formatRate(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}
