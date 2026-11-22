import { apiClient } from "@/lib/api/client";
import type { DashboardPeriod } from "@/features/dashboard/v2/period";
import type { DashboardMoney } from "./money-types";

export function getDashboardMoney(period: DashboardPeriod) {
  return apiClient.get<DashboardMoney>("/analytics/v2/money", { query: { period } });
}
