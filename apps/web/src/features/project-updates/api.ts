import { apiClient } from "@/lib/api/client";
import type { CreateProjectUpdateInput, ProjectUpdate, ProjectUpdatesPage } from "./types";

export function getProjectUpdatesFeed(params?: { limit?: number; before?: string }) {
  return apiClient.get<ProjectUpdatesPage>("/project-updates", {
    query: { limit: params?.limit ?? 10, ...(params?.before ? { before: params.before } : {}) },
  });
}

export function getProjectUpdates(projectId: string, params?: { before?: string }) {
  return apiClient.get<ProjectUpdatesPage>(`/projects/${projectId}/updates`, {
    query: { limit: 20, ...(params?.before ? { before: params.before } : {}) },
  });
}

export function createProjectUpdate(projectId: string, input: CreateProjectUpdateInput) {
  return apiClient.post<ProjectUpdate>(`/projects/${projectId}/updates`, input);
}

export function deleteProjectUpdate(projectId: string, updateId: string) {
  return apiClient.delete<{ id: string }>(`/projects/${projectId}/updates/${updateId}`);
}
