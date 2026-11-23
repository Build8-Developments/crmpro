import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateProjectInput,
  Project,
  ProjectFile,
  ProjectsListParams,
  ProjectsListResponse,
  UpdateProjectInput,
} from "./types";

export function getProjects(params?: ProjectsListParams) {
  return apiClient.get<ProjectsListResponse>("/projects", {
    query: serializeQueryParams({
      sortBy: "name",
      sortOrder: "asc",
      limit: 50,
      ...params,
    }),
  });
}

export function getProjectById(id: string) {
  return apiClient.get<Project>(`/projects/${id}`);
}

export function createProject(input: CreateProjectInput) {
  return apiClient.post<Project>("/projects", input);
}

export function updateProject(id: string, input: UpdateProjectInput) {
  return apiClient.patch<Project>(`/projects/${id}`, input);
}

export function deleteProject(id: string) {
  return apiClient.delete<{ id: string }>(`/projects/${id}`);
}

/** The project's own documents (brochures, price sheets); read-only. */
export function getProjectFiles(id: string) {
  return apiClient.get<ProjectFile[]>(`/projects/${id}/files`);
}
