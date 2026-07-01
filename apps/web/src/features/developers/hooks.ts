"use client";

import { useQuery } from "@tanstack/react-query";
import { getDeveloperById, getDevelopers } from "@/features/developers/api";
import type { DevelopersListParams } from "@/features/developers/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useDevelopers(
  params?: DevelopersListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.developers.list(params),
    queryFn: () => getDevelopers(params),
    enabled:
      status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useDeveloper(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.developers.detail(id ?? ""),
    queryFn: () => getDeveloperById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
