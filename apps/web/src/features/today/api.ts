import { apiClient } from "@/lib/api/client";
import type { TodayData } from "@/features/today/types";

export function getToday() {
  return apiClient.get<TodayData>("/today");
}
