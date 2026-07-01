"use client";

import { useQuery } from "@tanstack/react-query";
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
  });
}
