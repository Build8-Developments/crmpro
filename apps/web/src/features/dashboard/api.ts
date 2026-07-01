import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type { AnalyticsDateParams, DashboardOverviewData } from "./types";

export function getDashboardSummary(params?: AnalyticsDateParams) {
  return apiClient.get<DashboardOverviewData>("/analytics/overview", {
    query: serializeQueryParams(params ?? {}),
  });
}
