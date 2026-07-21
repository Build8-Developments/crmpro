import type { CSSProperties } from "react";
import type { PlatformAnalyticsDashboardData } from "@/features/dashboard/types";

export function isDashboardEffectivelyEmpty(
  data: PlatformAnalyticsDashboardData,
): boolean {
  return (
    data.tenants.total === 0 &&
    data.users.total === 0 &&
    data.leads.total === 0 &&
    data.contracts.total === 0 &&
    data.plans.total === 0 &&
    data.importActivity.last7d === 0 &&
    data.recentAudit.length === 0
  );
}

export const DASHBOARD_CHART_HEIGHT = 176;

export const DASHBOARD_ENTER_CLASS = "dashboard-enter";

export function dashboardEnterStyle(index: number): CSSProperties {
  return { animationDelay: `${index * 40}ms` };
}
