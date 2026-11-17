"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { getCustomFields } from "./api";

export function useCustomFields(options?: { includeArchived?: boolean }) {
  const status = useAuthStore((state) => state.status);
  const includeArchived = options?.includeArchived ?? false;

  return useQuery({
    queryKey: queryKeys.customFields.list(includeArchived),
    queryFn: async () => (await getCustomFields(includeArchived)).items,
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
}
