import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  AnalyticsDashboardData,
  DashboardQueryParams,
} from "./types";

export function getDashboard(params?: DashboardQueryParams) {
  return apiClient.get<AnalyticsDashboardData>("/analytics/dashboard", {
    query: serializeQueryParams(params ?? {}),
  });
}
