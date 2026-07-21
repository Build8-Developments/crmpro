import { apiClient } from "@/lib/api/client";
import type { SystemHealth } from "./types";

export function getSystemHealth() {
  return apiClient.get<SystemHealth>("/system/health");
}
