"use client";

import { useQuery } from "@tanstack/react-query";
import { getSystemHealth } from "@/features/system/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useSystemHealth(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.system.health(),
    queryFn: getSystemHealth,
    enabled: status === "authenticated" && (options?.enabled ?? true),
    refetchInterval: 30_000,
  });
}
