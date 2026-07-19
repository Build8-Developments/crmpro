"use client";

import { useQuery } from "@tanstack/react-query";
import { getExportJob, getExportJobs } from "@/features/exports/api";
import type { ExportJobsListParams } from "@/features/exports/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

const ACTIVE_STATUSES = new Set(["PENDING", "PROCESSING"]);

export function useExportJobs(
  params?: ExportJobsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.exports.list(params),
    queryFn: () => getExportJobs(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const hasActive = items.some((job) => ACTIVE_STATUSES.has(job.status));
      return hasActive ? 2500 : false;
    },
  });
}

export function useExportJob(id?: string) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.exports.detail(id ?? ""),
    queryFn: () => getExportJob(id!),
    enabled: status === "authenticated" && Boolean(id),
    refetchInterval: (query) => {
      const jobStatus = query.state.data?.status;
      return jobStatus && ACTIVE_STATUSES.has(jobStatus) ? 2000 : false;
    },
  });
}
