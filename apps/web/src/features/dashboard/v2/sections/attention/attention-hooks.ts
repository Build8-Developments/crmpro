"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import {
  DASHBOARD_PERIOD_DEFAULT,
  dashboardV2Keys,
} from "@/features/dashboard/v2/period";
import { useAuthStore } from "@/stores/auth-store";
import { getDashboardAttention, nudgeAgent } from "./attention-api";
import type { NudgeAgentResult } from "./attention-types";

/**
 * Live numbers, refreshed every minute while the dashboard is open. The
 * period does not apply to them, so switching it does not refetch.
 */
export function useDashboardAttention() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: dashboardV2Keys.section("attention", DASHBOARD_PERIOD_DEFAULT),
    queryFn: () => getDashboardAttention(DASHBOARD_PERIOD_DEFAULT),
    enabled: status === "authenticated",
    refetchInterval: 60_000,
    // A 403 (plan without analytics, or role without access) won't succeed on retry.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 403) && failureCount < 1,
  });
}

function nudgeMessage(result: NudgeAgentResult): string {
  if (result.sent) return "Reminder sent";
  if (result.reason === "ALREADY_NUDGED") return "Already reminded in the last hour";
  return "Nothing to remind them about any more";
}

export function useNudgeAgent() {
  return useApiMutation({
    mutationFn: nudgeAgent,
    successMessage: nudgeMessage,
    errorMessage: "Could not send the reminder.",
  });
}
