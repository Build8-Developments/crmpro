import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreatePipelineInput,
  CreateStageInput,
  Pipeline,
  PipelinesListParams,
  PipelinesListResponse,
  PipelineStage,
  UpdatePipelineInput,
  UpdateStageInput,
} from "./types";

export function getPipelines(params?: PipelinesListParams) {
  return apiClient.get<PipelinesListResponse>("/pipelines", {
    query: serializeQueryParams({
      sortBy: "name",
      sortOrder: "asc",
      limit: 100,
      ...params,
    }),
  });
}

export function getPipelineById(id: string) {
  return apiClient.get<Pipeline>(`/pipelines/${id}`);
}

export function createPipeline(input: CreatePipelineInput) {
  return apiClient.post<Pipeline>("/pipelines", input);
}

export function updatePipeline(id: string, input: UpdatePipelineInput) {
  return apiClient.patch<Pipeline>(`/pipelines/${id}`, input);
}

export function deletePipeline(id: string) {
  return apiClient.delete<{ id: string }>(`/pipelines/${id}`);
}

export function createStage(pipelineId: string, input: CreateStageInput) {
  return apiClient.post<PipelineStage>(
    `/pipelines/${pipelineId}/stages`,
    input,
  );
}

export function updateStage(
  pipelineId: string,
  stageId: string,
  input: UpdateStageInput,
) {
  return apiClient.patch<PipelineStage>(
    `/pipelines/${pipelineId}/stages/${stageId}`,
    input,
  );
}

export function deleteStage(pipelineId: string, stageId: string) {
  return apiClient.delete<{ id: string }>(
    `/pipelines/${pipelineId}/stages/${stageId}`,
  );
}
