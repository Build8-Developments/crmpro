"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { getDashboard } from "@/features/dashboard/api";
import type { DashboardQueryParams } from "@/features/dashboard/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useDashboardSummary(params?: DashboardQueryParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.dashboard.summary(params),
    queryFn: () => getDashboard(params),
    enabled: status === "authenticated",
    // A 403 (plan without analytics, or role without access) won't succeed on
    // retry; surface it immediately so the page can explain it.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 403) && failureCount < 1,
  });
}
