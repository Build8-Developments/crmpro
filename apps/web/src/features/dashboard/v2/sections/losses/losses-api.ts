import { apiClient } from "@/lib/api/client";
import type { DashboardPeriod } from "@/features/dashboard/v2/period";
import type { DashboardLosses } from "./losses-types";

export function getDashboardLosses(period: DashboardPeriod) {
  return apiClient.get<DashboardLosses>("/analytics/v2/losses", { query: { period } });
}
