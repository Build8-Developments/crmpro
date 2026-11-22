import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  Deal,
  DealsListParams,
  DealsListResponse,
  UpdateDealInput,
} from "./types";

export function getDeals(params?: DealsListParams) {
  return apiClient.get<DealsListResponse>("/deals", {
    query: serializeQueryParams(params ?? {}),
  });
}

export function getDeal(id: string) {
  return apiClient.get<Deal>(`/deals/${id}`);
}

/** Every deal of a lead, cancelled ones included, newest first. */
export function getLeadDeals(leadId: string) {
  return apiClient.get<Deal[]>(`/leads/${leadId}/deals`);
}

export function updateDeal(id: string, input: UpdateDealInput) {
  return apiClient.patch<Deal>(`/deals/${id}`, input);
}

export function contractDeal(id: string, contractedAt?: string) {
  return apiClient.post<Deal>(`/deals/${id}/contract`, { contractedAt });
}

/** Cancels the deal; the lead re-opens in the stage it was won from. */
export function cancelDeal(id: string, reason: string) {
  return apiClient.post<Deal>(`/deals/${id}/cancel`, { reason });
}
