"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlanById, getPlans } from "@/features/plans/api";
import type { PlansListParams } from "@/features/plans/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function usePlans(
  params?: PlansListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.plans.list(params ? { ...params } : undefined),
    queryFn: () => getPlans(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function usePlan(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.plans.detail(id ?? ""),
    queryFn: () => getPlanById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
