"use client";

import { useApiMutation } from "@/lib/query/use-api-mutation";
import {
  createProjectUpdate,
  deleteProjectUpdate,
  updateProjectUpdate,
} from "./api";
import { projectUpdateKeys } from "./query-keys";
import type { CreateProjectUpdateInput, UpdateProjectUpdateInput } from "./types";

const invalidateKeys = [projectUpdateKeys.all()];

export function useCreateProjectUpdate(projectId: string) {
  return useApiMutation({
    mutationFn: (input: CreateProjectUpdateInput) =>
      createProjectUpdate(projectId, input),
    successMessage: "Update posted",
    invalidateKeys,
  });
}

export function useEditProjectUpdate() {
  return useApiMutation({
    mutationFn: ({
      updateId,
      input,
    }: {
      updateId: string;
      input: UpdateProjectUpdateInput;
    }) => updateProjectUpdate(updateId, input),
    successMessage: "Update saved",
    invalidateKeys,
  });
}

export function useDeleteProjectUpdate() {
  return useApiMutation({
    mutationFn: (updateId: string) => deleteProjectUpdate(updateId),
    successMessage: "Update deleted",
    invalidateKeys,
  });
}
