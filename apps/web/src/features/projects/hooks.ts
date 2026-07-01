"use client";

import { useQuery } from "@tanstack/react-query";
import { getProjectById, getProjects } from "@/features/projects/api";
import type { ProjectsListParams } from "@/features/projects/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useProjects(
  params?: ProjectsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.projects.list(params),
    queryFn: () => getProjects(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useProject(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.projects.detail(id ?? ""),
    queryFn: () => getProjectById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
