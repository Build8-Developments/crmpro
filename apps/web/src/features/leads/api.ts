import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type { Lead, LeadsListParams, LeadsListResponse } from "./types";

export function getLeads(params?: LeadsListParams) {
  return apiClient.get<LeadsListResponse>("/leads", {
    query: serializeQueryParams(params ?? {}),
  });
}

export function getLeadById(id: string) {
  return apiClient.get<Lead>(`/leads/${id}`);
}
