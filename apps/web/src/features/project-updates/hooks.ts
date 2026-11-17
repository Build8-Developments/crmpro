"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { getProjectUpdates, getProjectUpdatesFeed } from "./api";

/** Latest updates across all projects (Today widget). */
export function useProjectUpdatesFeed(limit = 5) {
  const status = useAuthStore((state) => state.status);
  const { can } = usePermissions();

  return useQuery({
    queryKey: [...queryKeys.projects.updates(), limit],
    queryFn: () => getProjectUpdatesFeed({ limit }),
    enabled: status === "authenticated" && can("project.read"),
    staleTime: 60 * 1000,
  });
}

export function useProjectUpdates(projectId: string | null) {
  const status = useAuthStore((state) => state.status);

  return useInfiniteQuery({
    queryKey: queryKeys.projects.updates(projectId ?? undefined),
    queryFn: ({ pageParam }) =>
      getProjectUpdates(projectId!, pageParam ? { before: pageParam } : undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: status === "authenticated" && Boolean(projectId),
  });
}
