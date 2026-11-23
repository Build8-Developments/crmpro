import { apiClient } from "@/lib/api/client";
import type { DashboardPeriod } from "@/features/dashboard/v2/period";
import type { DashboardTeam } from "./team-types";

export function getDashboardTeam(period: DashboardPeriod) {
  return apiClient.get<DashboardTeam>("/analytics/v2/team", { query: { period } });
}
