"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { dashboardV2Keys, type DashboardPeriod } from "@/features/dashboard/v2/period";
import { useAuthStore } from "@/stores/auth-store";
import { getDashboardTeam } from "./team-api";

export function useDashboardTeam(period: DashboardPeriod) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: dashboardV2Keys.section("team", period),
    queryFn: () => getDashboardTeam(period),
    enabled: status === "authenticated",
    // A 403 (plan without analytics, or role without access) won't succeed on retry.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 403) && failureCount < 1,
  });
}
