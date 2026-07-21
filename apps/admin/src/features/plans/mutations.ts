"use client";

import {
  archivePlan,
  createPlan,
  unarchivePlan,
  updatePlan,
} from "@/features/plans/api";
import type { CreatePlanInput, UpdatePlanInput } from "@/features/plans/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const planInvalidateKeys = [
  queryKeys.plans.all(),
  queryKeys.dashboard.all(),
  queryKeys.contracts.all(),
] as const;

export function useCreatePlan() {
  return useApiMutation({
    mutationFn: (input: CreatePlanInput) => createPlan(input),
    successMessage: "Plan created",
    invalidateKeys: [...planInvalidateKeys],
  });
}

export function useUpdatePlan() {
  return useApiMutation({
    mutationFn: ({
      planId,
      input,
    }: {
      planId: string;
      input: UpdatePlanInput;
    }) => updatePlan(planId, input),
    successMessage: "Plan updated",
    invalidateKeys: [...planInvalidateKeys],
  });
}

export function useArchivePlan() {
  return useApiMutation({
    mutationFn: (planId: string) => archivePlan(planId),
    successMessage: "Plan archived",
    invalidateKeys: [...planInvalidateKeys],
  });
}

export function useUnarchivePlan() {
  return useApiMutation({
    mutationFn: (planId: string) => unarchivePlan(planId),
    successMessage: "Plan restored",
    invalidateKeys: [...planInvalidateKeys],
  });
}
