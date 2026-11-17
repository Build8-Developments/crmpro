"use client";

import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { createProjectUpdate, deleteProjectUpdate } from "./api";
import type { CreateProjectUpdateInput } from "./types";

export function useCreateProjectUpdate(projectId: string) {
  return useApiMutation({
    mutationFn: (input: CreateProjectUpdateInput) =>
      createProjectUpdate(projectId, input),
    successMessage: "Update posted",
    invalidateKeys: [queryKeys.projects.updatesAll()],
  });
}

export function useDeleteProjectUpdate(projectId: string) {
  return useApiMutation({
    mutationFn: (updateId: string) => deleteProjectUpdate(projectId, updateId),
    successMessage: "Update removed",
    invalidateKeys: [queryKeys.projects.updatesAll()],
  });
}
