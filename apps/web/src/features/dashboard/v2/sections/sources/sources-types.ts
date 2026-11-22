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

/** Leads list filtered by source (the list has no "no source" filter). */
export function sourceLeadsHref(sourceId: string | null): string | null {
  return sourceId ? `/leads?sourceIds=${encodeURIComponent(sourceId)}` : null;
}

export function projectLeadsHref(projectId: string): string {
  return `/leads?projectId=${encodeURIComponent(projectId)}`;
}

export function formatRate(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}
