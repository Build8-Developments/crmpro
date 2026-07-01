"use client";

import { useQuery } from "@tanstack/react-query";
import { getPipelineById, getPipelines } from "@/features/pipelines/api";
import type { PipelinesListParams } from "@/features/pipelines/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function usePipelines(params?: PipelinesListParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.pipelines.list(params),
    queryFn: () => getPipelines(params),
    enabled: status === "authenticated",
    placeholderData: (previous) => previous,
  });
}

export function usePipeline(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.pipelines.detail(id ?? ""),
    queryFn: () => getPipelineById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
