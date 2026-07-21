"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlatformDashboard } from "@/features/dashboard/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useDashboardSummary(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => getPlatformDashboard(),
    enabled: status === "authenticated" && (options?.enabled ?? true),
  });
}
