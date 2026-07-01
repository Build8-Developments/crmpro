"use client";

import {
  createPipeline,
  createStage,
  deletePipeline,
  deleteStage,
  updatePipeline,
  updateStage,
} from "@/features/pipelines/api";
import type {
  CreatePipelineInput,
  CreateStageInput,
  UpdatePipelineInput,
  UpdateStageInput,
} from "@/features/pipelines/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const pipelineInvalidateKeys = [
  queryKeys.pipelines.all(),
  queryKeys.dashboard.all(),
  queryKeys.leads.all(),
] as const;

export function useCreatePipeline() {
  return useApiMutation({
    mutationFn: (input: CreatePipelineInput) => createPipeline(input),
    successMessage: "Pipeline created",
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}

export function useUpdatePipeline() {
  return useApiMutation({
    mutationFn: ({
      pipelineId,
      input,
    }: {
      pipelineId: string;
      input: UpdatePipelineInput;
    }) => updatePipeline(pipelineId, input),
    successMessage: "Pipeline updated",
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}

export function useDeletePipeline() {
  return useApiMutation({
    mutationFn: (pipelineId: string) => deletePipeline(pipelineId),
    successMessage: "Pipeline deleted",
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}

export function useCreateStage() {
  return useApiMutation({
    mutationFn: ({
      pipelineId,
      input,
    }: {
      pipelineId: string;
      input: CreateStageInput;
    }) => createStage(pipelineId, input),
    successMessage: "Stage added",
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}

export function useReorderPipelineStage() {
  return useApiMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      sortOrder,
    }: {
      pipelineId: string;
      stageId: string;
      sortOrder: number;
    }) => updateStage(pipelineId, stageId, { sortOrder }),
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}

export function useUpdateStage() {
  return useApiMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      input,
    }: {
      pipelineId: string;
      stageId: string;
      input: UpdateStageInput;
    }) => updateStage(pipelineId, stageId, input),
    successMessage: "Stage updated",
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}

export function useDeleteStage() {
  return useApiMutation({
    mutationFn: ({
      pipelineId,
      stageId,
    }: {
      pipelineId: string;
      stageId: string;
    }) => deleteStage(pipelineId, stageId),
    successMessage: "Stage deleted",
    invalidateKeys: [...pipelineInvalidateKeys],
  });
}
