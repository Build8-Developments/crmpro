"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyPerformance } from "@/features/performance/api";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";

/** Kept next to the feature: nothing else reads or invalidates it. */
export const PERFORMANCE_QUERY_KEY = ["stats", "me", "performance"] as const;

/** The signed-in user's performance, badges and rank. */
export function useMyPerformance() {
  const status = useAuthStore((state) => state.status);
  const { can } = usePermissions();
  return useQuery({
    queryKey: PERFORMANCE_QUERY_KEY,
    queryFn: getMyPerformance,
    enabled: status === "authenticated" && can("analytics.read"),
    staleTime: 60_000,
  });
}
