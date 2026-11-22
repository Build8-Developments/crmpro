import { apiClient } from "@/lib/api/client";
import type { DashboardPeriod } from "@/features/dashboard/v2/period";
import type { DashboardSources } from "./sources-types";

export function getDashboardSources(period: DashboardPeriod) {
  return apiClient.get<DashboardSources>("/analytics/v2/sources", { query: { period } });
}
