import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateProjectUpdateInput,
  ProjectUpdate,
  ProjectUpdatesFeedParams,
  ProjectUpdatesPage,
  UpdateProjectUpdateInput,
} from "./types";

export function getProjectUpdatesFeed(params: ProjectUpdatesFeedParams) {
  return apiClient.get<ProjectUpdatesPage>("/project-updates", {
    query: serializeQueryParams({
      ...params,
      projectIds: params.projectIds?.length ? params.projectIds.join(",") : undefined,
    }),
  });
}

export function getProjectUpdates(
  projectId: string,
  params?: { limit?: number; cursor?: string },
) {
  return apiClient.get<ProjectUpdatesPage>(`/projects/${projectId}/updates`, {
    query: serializeQueryParams({ limit: 20, ...params }),
  });
}

export function createProjectUpdate(
  projectId: string,
  input: CreateProjectUpdateInput,
) {
  return apiClient.post<ProjectUpdate>(`/projects/${projectId}/updates`, input);
}

export function updateProjectUpdate(
  updateId: string,
  input: UpdateProjectUpdateInput,
) {
  return apiClient.patch<ProjectUpdate>(`/project-updates/${updateId}`, input);
}

export function deleteProjectUpdate(updateId: string) {
  return apiClient.delete<{ id: string }>(`/project-updates/${updateId}`);
}
