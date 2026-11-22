import { apiClient } from "@/lib/api/client";
import type { MyPerformance } from "@/features/performance/types";

export function getMyPerformance() {
  return apiClient.get<MyPerformance>("/stats/me/performance");
}
