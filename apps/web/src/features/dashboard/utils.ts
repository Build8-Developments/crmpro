import type { CSSProperties } from "react";
import type { AnalyticsDashboardData } from "@/features/dashboard/types";

export function isDashboardEffectivelyEmpty(
  data: AnalyticsDashboardData,
): boolean {
  const totalLeads = data.overview?.totalLeads ?? 0;
  if (totalLeads > 0) {
    return false;
  }

  const pipelineTotal =
    data.pipeline?.stages.reduce((sum, stage) => sum + stage.count, 0) ?? 0;

  return pipelineTotal === 0;
}

export const DASHBOARD_CHART_HEIGHT = 176;

/** Header strip inside list panels (px). */
export const DASHBOARD_LIST_HEADER_HEIGHT = 30;

/** Body row height inside list panels (px). */
export const DASHBOARD_LIST_ROW_HEIGHT = 52;

export function getDashboardListPanelHeight(rowCount: number): number {
  return DASHBOARD_LIST_HEADER_HEIGHT + rowCount * DASHBOARD_LIST_ROW_HEIGHT;
}

/** Row count used to sync pipeline stages vs trends day list height. */
export function getDashboardListRowCount(
  stageCount: number | undefined,
  hasTrends: boolean,
): number {
  const stages = stageCount ?? 0;
  const trendRows = hasTrends ? 7 : 0;
  return Math.max(stages, trendRows, 1);
}

export const DASHBOARD_ENTER_CLASS =
  "dashboard-enter opacity-0 translate-y-2";

export function dashboardEnterStyle(index: number): CSSProperties {
  return { animationDelay: `${index * 40}ms` };
}
