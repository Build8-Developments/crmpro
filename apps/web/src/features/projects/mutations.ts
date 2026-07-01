"use client";

import {
  createProject,
  deleteProject,
  updateProject,
} from "@/features/projects/api";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/features/projects/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const projectInvalidateKeys = [
  queryKeys.projects.all(),
  queryKeys.developers.all(),
  queryKeys.dashboard.all(),
  ["leads", "filter-options", "projects"] as const,
] as const;

export function useCreateProject() {
  return useApiMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    successMessage: "Project created",
    invalidateKeys: [...projectInvalidateKeys],
  });
}

export function useUpdateProject() {
  return useApiMutation({
    mutationFn: ({
      projectId,
      input,
    }: {
      projectId: string;
      input: UpdateProjectInput;
    }) => updateProject(projectId, input),
    successMessage: "Project updated",
    invalidateKeys: [...projectInvalidateKeys],
  });
}

export function useDeleteProject() {
  return useApiMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    successMessage: "Project deleted",
    invalidateKeys: [...projectInvalidateKeys],
  });
}
