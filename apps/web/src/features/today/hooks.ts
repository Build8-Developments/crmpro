"use client";

import { useQuery } from "@tanstack/react-query";
import { getToday } from "@/features/today/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useToday() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.today(),
    queryFn: getToday,
    enabled: status === "authenticated",
    // Realtime hints refresh it; the interval keeps "overdue" honest.
    refetchInterval: 60_000,
  });
}
