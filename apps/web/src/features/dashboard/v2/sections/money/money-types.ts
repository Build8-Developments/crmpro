/** Mirrors apps/api/.../dashboard-v2/dashboard-money.types.ts. */
import type { DashboardPeriod } from "@/features/dashboard/v2/period";

export type MoneyTargetOwner = "workspace" | "team" | "own";
export type MoneyTargetBasis = "month" | "prorated";

export interface MoneyTarget {
  value: number;
  basis: MoneyTargetBasis;
  owner: MoneyTargetOwner;
  percent: number | null;
  /** Month to date only: where the actual should be by now. */
  expectedByNow: number | null;
}

export interface MoneyMetric {
  current: number;
  previous: number;
  changePercent: number | null;
  target: MoneyTarget | null;
}

export interface DealBucket {
  count: number;
  value: number;
  previousCount: number;
  previousValue: number;
  countChangePercent: number | null;
  valueChangePercent: number | null;
  /** `/deals?…` parameters. */
  listQuery: Record<string, string>;
}

export interface ForecastStageRow {
  stageId: string;
  stageName: string;
  pipelineId: string;
  pipelineName: string;
  openLeads: number;
  reachedCount: number;
  wonCount: number;
  winRate: number | null;
  expectedDeals: number;
  expectedRevenue: number;
  /** `/leads?…` parameters. */
  listQuery: Record<string, string>;
}

export interface DashboardMoney {
  period: {
    key: DashboardPeriod;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    months: string[];
    month: string | null;
  };
  currency: string;
  revenue: MoneyMetric;
  commission: MoneyMetric;
  deals: {
    reserved: DealBucket & { target: MoneyTarget | null };
    contracted: DealBucket;
    cancelled: DealBucket;
  };
  reservedBacklog: { count: number; value: number; listQuery: Record<string, string> };
  forecast: {
    method: string;
    lookbackMonths: number;
    averageDealPrice: number;
    averageDealSampleSize: number;
    stages: ForecastStageRow[];
    totals: { openLeads: number; expectedDeals: number; expectedRevenue: number };
  };
  trend: {
    granularity: "day" | "week";
    points: Array<{ date: string; previousDate: string; current: number; previous: number }>;
  };
}

export function dealsHref(query: Record<string, string>): string {
  const search = new URLSearchParams(query).toString();
  return search ? `/deals?${search}` : "/deals";
}

export function leadsListHref(query: Record<string, string>): string {
  return `/leads?${new URLSearchParams(query).toString()}`;
}

export const PREVIOUS_LABELS: Record<DashboardPeriod, string> = {
  "this-month": "vs same days last month",
  "last-month": "vs the month before",
  "last-30-days": "vs previous 30 days",
  "last-90-days": "vs previous 90 days",
};
