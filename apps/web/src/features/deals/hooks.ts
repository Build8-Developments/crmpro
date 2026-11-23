"use client";

import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { getDeals, getLeadDeals } from "./api";
import type { DealsListParams } from "./types";

export function useDeals(params: DealsListParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.deals.list(params),
    queryFn: () => getDeals(params),
    enabled: status === "authenticated",
    placeholderData: (previous) => previous,
  });
}

/** A lead's deal history (live first by date; cancelled ones included). */
export function useLeadDeals(leadId: string | undefined) {
  const { can } = usePermissions();

  return useQuery({
    queryKey: queryKeys.deals.forLead(leadId ?? ""),
    queryFn: () => getLeadDeals(leadId!),
    enabled: can("deal.read") && Boolean(leadId),
  });
}
