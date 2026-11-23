"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getLeadAttachments,
  getLeadInteractions,
  getLeadTasks,
  getLostReasons,
  getLeadActivities,
  getLeadFilterPipelines,
  getLeadFilterProjects,
  getLeadFilterSources,
  getLeadFilterUsers,
  getLeadById,
  getLeadDuplicates,
  getLeadNotes,
  getLeads,
  mapUsersToFilterOptions,
} from "@/features/leads/api";
import {
  buildLeadsListParams,
  useLeadsTableStore,
} from "@/features/leads/stores/leads-table-store";
import type { LeadsListParams } from "@/features/leads/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ApiError } from "@/lib/api/client";
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
    // A missing (or merged-away) lead won't appear on retry.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });
}

/** Possible duplicates of a lead (only fetched when the caller can merge). */
export function useLeadDuplicates(leadId: string | undefined, enabled = true) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.leads.detail(leadId ?? ""), "duplicates"],
    queryFn: () => getLeadDuplicates(leadId!),
    enabled: enabled && status === "authenticated" && Boolean(leadId),
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
        isDefault: pipeline.isDefault,
        stages: pipeline.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
          sortOrder: stage.sortOrder,
          icon: stage.icon,
          isClosed: stage.isClosed,
          closeType: stage.closeType,
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
    queryFn: async () =>
      mapUsersToFilterOptions((await getLeadFilterUsers()).items),
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

export function useLeadNotes(leadId: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.leads.detail(leadId ?? ""), "notes"],
    queryFn: () => getLeadNotes(leadId!),
    enabled: status === "authenticated" && Boolean(leadId),
  });
}

export function useLeadActivities(leadId: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.leads.detail(leadId ?? ""), "activities"],
    queryFn: async () => (await getLeadActivities(leadId!)).items,
    enabled: status === "authenticated" && Boolean(leadId),
  });
}

export function useLostReasons(includeInactive = false) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: ["lost-reasons", { includeInactive }],
    queryFn: () => getLostReasons(includeInactive),
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadTasks(leadId: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.leads.detail(leadId ?? ""), "tasks"],
    queryFn: async () => (await getLeadTasks(leadId!)).items,
    enabled: status === "authenticated" && Boolean(leadId),
  });
}

export function useLeadInteractions(leadId: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.leads.detail(leadId ?? ""), "interactions"],
    queryFn: () => getLeadInteractions(leadId!),
    enabled: status === "authenticated" && Boolean(leadId),
  });
}

export function useLeadAttachments(leadId: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.leads.detail(leadId ?? ""), "attachments"],
    queryFn: () => getLeadAttachments(leadId!),
    enabled: status === "authenticated" && Boolean(leadId),
  });
}
