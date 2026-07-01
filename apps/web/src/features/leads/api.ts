import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type { PaginatedResponse } from "@/types/pagination";
import type { Lead, LeadsListParams, LeadsListResponse } from "./types";

export function getLeads(params?: LeadsListParams) {
  return apiClient.get<LeadsListResponse>("/leads", {
    query: serializeQueryParams(params ?? {}),
  });
}

export function getLeadById(id: string) {
  return apiClient.get<Lead>(`/leads/${id}`);
}

/** Lightweight option lists for leads filter sheet. */
export interface FilterOption {
  id: string;
  name: string;
}

interface PipelineStageOption {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
}

interface PipelineListItem {
  id: string;
  name: string;
  stages: PipelineStageOption[];
}

export function getLeadFilterPipelines() {
  return apiClient.get<PaginatedResponse<PipelineListItem>>("/pipelines", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function getLeadFilterSources() {
  return apiClient.get<PaginatedResponse<FilterOption>>("/lead-sources", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function getLeadFilterUsers() {
  return apiClient.get<PaginatedResponse<FilterOption>>("/users", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function getLeadFilterProjects() {
  return apiClient.get<PaginatedResponse<FilterOption>>("/projects", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}
