"use client";

import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cancelDeal, contractDeal, updateDeal } from "./api";
import type { UpdateDealInput } from "./types";

// Deal keys sit under "leads", so this also refreshes deal lists and cards.
const dealInvalidateKeys = [
  queryKeys.leads.all(),
  queryKeys.dashboard.all(),
  queryKeys.today(),
];

export function useUpdateDeal() {
  return useApiMutation({
    mutationFn: ({ dealId, input }: { dealId: string; input: UpdateDealInput }) =>
      updateDeal(dealId, input),
    successMessage: "Deal updated",
    invalidateKeys: dealInvalidateKeys,
  });
}

export function useContractDeal() {
  return useApiMutation({
    mutationFn: ({ dealId, contractedAt }: { dealId: string; contractedAt?: string }) =>
      contractDeal(dealId, contractedAt),
    successMessage: "Deal marked as contracted",
    invalidateKeys: dealInvalidateKeys,
  });
}

export function useCancelDeal() {
  return useApiMutation({
    mutationFn: ({ dealId, reason }: { dealId: string; reason: string }) =>
      cancelDeal(dealId, reason),
    successMessage: "Deal cancelled — the lead is open again",
    invalidateKeys: dealInvalidateKeys,
  });
}
