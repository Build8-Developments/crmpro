"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createLeadSource,
  deleteLeadSource,
  getLeadSources,
  updateLeadSource,
} from "@/features/lead-sources/api";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useAuthStore } from "@/stores/auth-store";

const LEAD_SOURCES_KEY = ["lead-sources"] as const;
// Lead filters and forms cache sources under this key; keep them in sync.
const LEAD_FILTER_SOURCES_KEY = ["leads", "filter-options", "sources"] as const;

const invalidateKeys = [
  LEAD_SOURCES_KEY,
  LEAD_FILTER_SOURCES_KEY,
  ["dashboard"] as const,
];

export function useLeadSources() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: LEAD_SOURCES_KEY,
    queryFn: getLeadSources,
    enabled: status === "authenticated",
  });
}

export function useCreateLeadSource() {
  return useApiMutation({
    mutationFn: (name: string) => createLeadSource(name),
    successMessage: "Lead source added",
    invalidateKeys,
  });
}

export function useUpdateLeadSource() {
  return useApiMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateLeadSource(id, name),
    successMessage: "Lead source renamed",
    invalidateKeys,
  });
}

export function useDeleteLeadSource() {
  return useApiMutation({
    mutationFn: (id: string) => deleteLeadSource(id),
    successMessage: "Lead source deleted",
    invalidateKeys,
  });
}
