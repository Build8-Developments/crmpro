import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateDeveloperInput,
  Developer,
  DevelopersListParams,
  DevelopersListResponse,
  UpdateDeveloperInput,
} from "./types";

export function getDevelopers(params?: DevelopersListParams) {
  return apiClient.get<DevelopersListResponse>("/developers", {
    query: serializeQueryParams({
      sortBy: "name",
      sortOrder: "asc",
      limit: 50,
      ...params,
    }),
  });
}

export function getDeveloperById(id: string) {
  return apiClient.get<Developer>(`/developers/${id}`);
}

export function createDeveloper(input: CreateDeveloperInput) {
  return apiClient.post<Developer>("/developers", input);
}

export function updateDeveloper(id: string, input: UpdateDeveloperInput) {
  return apiClient.patch<Developer>(`/developers/${id}`, input);
}

export function deleteDeveloper(id: string) {
  return apiClient.delete<{ id: string }>(`/developers/${id}`);
}
