import { apiClient } from "@/lib/api/client";
import type { DashboardPeriod } from "@/features/dashboard/v2/period";
import type { DashboardAttention, NudgeAgentResult, NudgeKind } from "./attention-types";

export function getDashboardAttention(period: DashboardPeriod) {
  return apiClient.get<DashboardAttention>("/analytics/v2/attention", {
    query: { period },
  });
}

export function nudgeAgent(input: { userId: string; kind: NudgeKind }) {
  return apiClient.post<NudgeAgentResult>("/analytics/v2/attention/nudge", input);
}
