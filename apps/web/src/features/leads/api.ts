import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  BulkLeadActionResult,
  CreateLeadInput,
  CreateLeadResult,
  Lead,
  LeadMutationResult,
  UpdateLeadInput,
  LeadNote,
  LeadTimelineActivity,
  LeadsListParams,
  LeadsListResponse,
  LogLeadActivityInput,
} from "./types";

export function getLeads(params?: LeadsListParams) {
  return apiClient.get<LeadsListResponse>("/leads", {
    query: serializeQueryParams(params ?? {}),
  });
}

export function getLeadById(id: string) {
  return apiClient.get<Lead>(`/leads/${id}`);
}

export function createLead(input: CreateLeadInput) {
  return apiClient.post<CreateLeadResult>("/leads", input);
}

export function updateLead(id: string, body: UpdateLeadInput) {
  return apiClient.patch<LeadMutationResult>(`/leads/${id}`, body);
}

export function assignLead(id: string, userId: string | null) {
  return apiClient.post<Lead>(`/leads/${id}/assign`, { userId });
}

export function moveLeadStage(id: string, pipelineStageId: string) {
  return apiClient.post<Lead>(`/leads/${id}/move-stage`, { pipelineStageId });
}

export function bulkAssignLeads(leadIds: string[], userId: string | null) {
  return apiClient.post<BulkLeadActionResult>("/leads/bulk/assign", {
    leadIds,
    userId,
  });
}

export function bulkMoveLeadsStage(leadIds: string[], targetStageId: string) {
  return apiClient.post<BulkLeadActionResult>("/leads/bulk/move-stage", {
    leadIds,
    targetStageId,
  });
}

export function archiveLead(id: string) {
  return apiClient.post<LeadMutationResult>(`/leads/${id}/archive`);
}

export function restoreLead(id: string) {
  return apiClient.post<LeadMutationResult>(`/leads/${id}/restore`);
}

export function deleteLead(id: string) {
  return apiClient.delete<{ id: string }>(`/leads/${id}`);
}

export function bulkArchiveLeads(leadIds: string[]) {
  return apiClient.post<BulkLeadActionResult>("/leads/bulk/archive", {
    leadIds,
  });
}

export function bulkRestoreLeads(leadIds: string[]) {
  return apiClient.post<BulkLeadActionResult>("/leads/bulk/restore", {
    leadIds,
  });
}

export function logLeadActivity(leadId: string, input: LogLeadActivityInput) {
  return apiClient.post<{ activity: unknown; nextTask: unknown }>(
    `/leads/${leadId}/activities`,
    input,
  );
}

export async function getLeadNotes(leadId: string) {
  const data = await apiClient.get<{ items: LeadNote[] }>(
    `/leads/${leadId}/notes`,
  );
  return data.items;
}

export function createLeadNote(leadId: string, content: string) {
  return apiClient.post<LeadNote>(`/leads/${leadId}/notes`, { content });
}

export function getLeadActivities(leadId: string) {
  return apiClient.get<PaginatedResponse<LeadTimelineActivity>>(
    `/leads/${leadId}/activities`,
    { query: { limit: 20, page: 1 } },
  );
}

/** Lightweight option lists for leads filter sheet. */
export interface FilterOption {
  id: string;
  name: string;
}

export interface UserFilterOption extends FilterOption {
  email: string;
}

interface PipelineStageOption {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isClosed: boolean;
}

interface PipelineListItem {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStageOption[];
}

export function getLeadFilterPipelines() {
  return apiClient.get<PaginatedResponse<PipelineListItem>>("/pipelines", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function getLeadFilterSources() {
  return apiClient.get<PaginatedResponse<FilterOption>>("/lead-sources", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function getLeadFilterUsers() {
  return apiClient.get<
    PaginatedResponse<{ id: string; fullName: string; email: string }>
  >("/users", {
    query: {
      limit: 100,
      sortBy: "name",
      sortOrder: "asc",
      isActive: true,
    },
  });
}

export function mapUsersToFilterOptions(
  users: Array<{ id: string; fullName: string; email: string }>,
): UserFilterOption[] {
  return users.map((user) => ({
    id: user.id,
    name: user.fullName,
    email: user.email,
  }));
}

export function getLeadFilterProjects() {
  return apiClient.get<PaginatedResponse<FilterOption>>("/projects", {
    query: { limit: 100, sortBy: "name", sortOrder: "asc" },
  });
}

export function getDefaultPipelinePlacement(
  pipelines: PipelineListItem[],
): { pipelineId: string; pipelineStageId: string } | null {
  if (pipelines.length === 0) return null;

  const pipeline =
    pipelines.find((item) => item.isDefault) ?? pipelines[0];
  const firstStage = [...pipeline.stages].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];

  if (!firstStage) return null;

  return {
    pipelineId: pipeline.id,
    pipelineStageId: firstStage.id,
  };
}
