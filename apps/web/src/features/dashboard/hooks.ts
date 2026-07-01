"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/features/dashboard/api";
import type { AnalyticsDateParams } from "@/features/dashboard/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useDashboardSummary(params?: AnalyticsDateParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.dashboard.summary(params),
    queryFn: () => getDashboardSummary(params),
    enabled: status === "authenticated",
  });
}
