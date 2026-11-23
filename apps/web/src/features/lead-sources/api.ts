import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/pagination";

export interface LeadSource {
  id: string;
  name: string;
}

export function getLeadSources() {
  return apiClient.get<PaginatedResponse<LeadSource>>("/lead-sources", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function createLeadSource(name: string) {
  return apiClient.post<LeadSource>("/lead-sources", { name });
}

export function updateLeadSource(id: string, name: string) {
  return apiClient.patch<LeadSource>(`/lead-sources/${id}`, { name });
}

export function deleteLeadSource(id: string) {
  return apiClient.delete<{ id: string }>(`/lead-sources/${id}`);
}
