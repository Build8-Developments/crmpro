"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getMyTargets,
  getTargetSuggestions,
  getTargets,
  saveTargets,
} from "@/features/targets/api";
import type { SaveTargetsInput } from "@/features/targets/types";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useAuthStore } from "@/stores/auth-store";

/** The targets grid for a month; `null` asks for the current workspace month. */
export function useTargetsGrid(period: string | null) {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.targets.grid(period),
    queryFn: () => getTargets(period ?? undefined),
    enabled: status === "authenticated",
    placeholderData: (previous) => previous,
  });
}

export function useSaveTargets() {
  return useApiMutation({
    mutationFn: (input: SaveTargetsInput) => saveTargets(input),
    successMessage: "Targets saved",
    invalidateKeys: [queryKeys.targets.all()],
  });
}

/** Read-only helpers: suggestions and last month's grid, fetched on demand. */
export function useTargetSuggestions() {
  return useMutation({ mutationFn: (period: string) => getTargetSuggestions(period) });
}

export function usePreviousTargets() {
  return useMutation({ mutationFn: (period: string) => getTargets(period) });
}

/** The signed-in user's month (Today side panel). */
export function useMyTargets() {
  const status = useAuthStore((state) => state.status);
  const { can } = usePermissions();
  return useQuery({
    queryKey: queryKeys.targets.mine(),
    queryFn: () => getMyTargets(),
    enabled: status === "authenticated" && can("target.read"),
    staleTime: 5 * 60 * 1000,
  });
}
