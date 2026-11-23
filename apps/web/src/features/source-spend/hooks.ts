"use client";

import { useQuery } from "@tanstack/react-query";
import { getSourceSpend, saveSourceSpend } from "@/features/source-spend/api";
import type { SaveSourceSpendInput } from "@/features/source-spend/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useAuthStore } from "@/stores/auth-store";

export function useSourceSpend(to: string | null) {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.sourceSpend.grid(to),
    queryFn: () => getSourceSpend(to ?? undefined),
    enabled: status === "authenticated",
    placeholderData: (previous) => previous,
  });
}

export function useSaveSourceSpend() {
  return useApiMutation({
    mutationFn: (input: SaveSourceSpendInput) => saveSourceSpend(input),
    successMessage: "Marketing spend saved",
    invalidateKeys: [queryKeys.sourceSpend.all()],
  });
}
