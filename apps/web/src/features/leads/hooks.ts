"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getLeadFilterPipelines,
  getLeadFilterProjects,
  getLeadFilterSources,
  getLeadFilterUsers,
  getLeadById,
  getLeads,
} from "@/features/leads/api";
import {
  buildLeadsListParams,
  useLeadsTableStore,
} from "@/features/leads/stores/leads-table-store";
import type { LeadsListParams } from "@/features/leads/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useLeadsListParams(search: string): LeadsListParams {
  const page = useLeadsTableStore((s) => s.page);
  const limit = useLeadsTableStore((s) => s.limit);
  const sortBy = useLeadsTableStore((s) => s.sortBy);
  const sortOrder = useLeadsTableStore((s) => s.sortOrder);
  const filters = useLeadsTableStore((s) => s.filters);
  const debouncedSearch = useDebouncedValue(search, 400);

  return buildLeadsListParams(debouncedSearch, {
    page,
    limit,
    sortBy,
    sortOrder,
    filters,
  });
}

export function useLeads(params?: LeadsListParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => getLeads(params),
    enabled: status === "authenticated",
    placeholderData: (previous) => previous,
  });
}

export function useLead(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.leads.detail(id ?? ""),
    queryFn: () => getLeadById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useLeadFilterOptions() {
  const authStatus = useAuthStore((state) => state.status);
  const enabled = authStatus === "authenticated";

  const pipelines = useQuery({
    queryKey: ["leads", "filter-options", "pipelines"],
    queryFn: async () => {
      const data = await getLeadFilterPipelines();
      return data.items.map((pipeline) => ({
        id: pipeline.id,
        name: pipeline.name,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
        })),
      }));
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const sources = useQuery({
    queryKey: ["leads", "filter-options", "sources"],
    queryFn: async () => (await getLeadFilterSources()).items,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const users = useQuery({
    queryKey: ["leads", "filter-options", "users"],
    queryFn: async () => (await getLeadFilterUsers()).items,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const projects = useQuery({
    queryKey: ["leads", "filter-options", "projects"],
    queryFn: async () => (await getLeadFilterProjects()).items,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return { pipelines, sources, users, projects };
}
