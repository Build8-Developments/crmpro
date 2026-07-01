"use client";

import {
  createDeveloper,
  deleteDeveloper,
  updateDeveloper,
} from "@/features/developers/api";
import type {
  CreateDeveloperInput,
  UpdateDeveloperInput,
} from "@/features/developers/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const developerInvalidateKeys = [
  queryKeys.developers.all(),
  queryKeys.dashboard.all(),
] as const;

export function useCreateDeveloper() {
  return useApiMutation({
    mutationFn: (input: CreateDeveloperInput) => createDeveloper(input),
    successMessage: "Developer created",
    invalidateKeys: [...developerInvalidateKeys],
  });
}

export function useUpdateDeveloper() {
  return useApiMutation({
    mutationFn: ({
      developerId,
      input,
    }: {
      developerId: string;
      input: UpdateDeveloperInput;
    }) => updateDeveloper(developerId, input),
    successMessage: "Developer updated",
    invalidateKeys: [...developerInvalidateKeys],
  });
}

export function useDeleteDeveloper() {
  return useApiMutation({
    mutationFn: (developerId: string) => deleteDeveloper(developerId),
    successMessage: "Developer deleted",
    invalidateKeys: [...developerInvalidateKeys],
  });
}
