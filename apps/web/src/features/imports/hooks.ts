"use client";

import { useQuery } from "@tanstack/react-query";
import { getImportJob, getImportJobs } from "@/features/imports/api";
import type { ImportJobsListParams } from "@/features/imports/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

const ACTIVE_STATUSES = new Set(["PENDING", "PROCESSING"]);

export function useImportJobs(
  params?: ImportJobsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.imports.list(params),
    queryFn: () => getImportJobs(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasActive = items.some((job) => ACTIVE_STATUSES.has(job.status));
      return hasActive ? 2500 : false;
    },
  });
}

export function useImportJob(id?: string) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.imports.detail(id ?? ""),
    queryFn: () => getImportJob(id!),
    enabled: status === "authenticated" && Boolean(id),
    refetchInterval: (query) => {
      const jobStatus = query.state.data?.status;
      return jobStatus && ACTIVE_STATUSES.has(jobStatus) ? 2000 : false;
    },
  });
}
