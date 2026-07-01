"use client";

import { useQuery } from "@tanstack/react-query";
import { getLeadById, getLeads } from "@/features/leads/api";
import type { LeadsListParams } from "@/features/leads/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useLeads(params?: LeadsListParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.leads.list(params),
    queryFn: () => getLeads(params),
    enabled: status === "authenticated",
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
