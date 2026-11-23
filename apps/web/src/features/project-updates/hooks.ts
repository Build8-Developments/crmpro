"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";
import { getProjectUpdates, getProjectUpdatesFeed } from "./api";
import { projectUpdateKeys } from "./query-keys";
import type { ProjectUpdatesFeedParams } from "./types";

/** One page of the tenant feed (e.g. the Today "Project news" card). */
export function useProjectUpdatesFeed(params: ProjectUpdatesFeedParams) {
  const status = useAuthStore((state) => state.status);
  const { can } = usePermissions();

  return useQuery({
    queryKey: projectUpdateKeys.feed(params),
    queryFn: () => getProjectUpdatesFeed(params),
    enabled: status === "authenticated" && can("project.read"),
    staleTime: 60_000,
  });
}

/** A project's updates, newest first, loaded page by page. */
export function useProjectUpdates(projectId: string | null) {
  const status = useAuthStore((state) => state.status);

  return useInfiniteQuery({
    queryKey: projectUpdateKeys.forProject(projectId ?? ""),
    queryFn: ({ pageParam }) =>
      getProjectUpdates(projectId!, pageParam ? { cursor: pageParam } : undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: status === "authenticated" && Boolean(projectId),
  });
}
