"use client";

import { useTranslations } from "next-intl";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cancelTask, completeTask, createTask, updateTask } from "./api";
import type { CompleteTaskInput, CreateTaskInput, UpdateTaskInput } from "./types";

// Follow-ups change Lead.nextFollowUpAt and the lead timeline.
const taskInvalidateKeys = [queryKeys.tasks.all(), queryKeys.leads.all()];

export function useCreateTask() {
  const t = useTranslations("tasks.toast");

  return useApiMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    successMessage: t("created"),
    invalidateKeys: taskInvalidateKeys,
  });
}

export function useUpdateTask() {
  const t = useTranslations("tasks.toast");

  return useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      updateTask(id, input),
    successMessage: t("updated"),
    invalidateKeys: taskInvalidateKeys,
  });
}

export function useCompleteTask() {
  const t = useTranslations("tasks.toast");

  return useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: CompleteTaskInput }) =>
      completeTask(id, input),
    successMessage: t("completed"),
    invalidateKeys: taskInvalidateKeys,
  });
}

export function useCancelTask() {
  const t = useTranslations("tasks.toast");

  return useApiMutation({
    mutationFn: (id: string) => cancelTask(id),
    successMessage: t("cancelled"),
    invalidateKeys: taskInvalidateKeys,
  });
}
