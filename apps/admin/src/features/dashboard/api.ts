import { apiClient } from "@/lib/api/client";
import type { PlatformAnalyticsDashboardData } from "./types";

export function getPlatformDashboard() {
  return apiClient.get<PlatformAnalyticsDashboardData>(
    "/platform-analytics/dashboard",
  );
}
