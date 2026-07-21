"use client";

import { useQuery } from "@tanstack/react-query";
import { globalSearch } from "@/features/search/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useGlobalSearch(query: string, options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);
  const trimmed = query.trim();

  return useQuery({
    queryKey: queryKeys.search.query(trimmed),
    queryFn: () => globalSearch(trimmed),
    enabled:
      status === "authenticated" &&
      trimmed.length >= 2 &&
      (options?.enabled ?? true),
    placeholderData: (previous) => previous,
    staleTime: 15_000,
  });
}
