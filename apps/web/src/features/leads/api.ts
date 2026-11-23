import type { DealDetailsInput } from "@/features/deals/types";
import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  ContactAccessAction,
  ContactField,
  LeadAttachment,
  LeadInteraction,
  LeadSelectionFilters,
  LeadTask,
  LogInteractionInput,
  LogInteractionResult,
  LostReason,
  BulkLeadActionResult,
  CreateLeadInput,
  CreateLeadResult,
  Lead,
  LeadDuplicatesResponse,
  LeadMergeResult,
  LeadMutationResult,
  MergeLeadsInput,
  UpdateLeadInput,
  LeadNote,
  LeadTimelineActivity,
  LeadsListParams,
  LeadsListResponse,
} from "./types";

export function getLeads(params?: LeadsListParams) {
  return apiClient.get<LeadsListResponse>("/leads", {
    query: serializeQueryParams(params ?? {}),
  });
}

/** Real phone/email for one field. Every call is logged on the lead. */
export function accessLeadContact(
  leadId: string,
  field: ContactField,
  action: ContactAccessAction,
) {
  return apiClient.post<{ field: ContactField; value: string | null }>(
    `/leads/${leadId}/contact-access`,
    { field, action },
  );
}

export function getLeadById(id: string) {
  return apiClient.get<Lead>(`/leads/${id}`);
}

/** Other leads you can see that share a phone or the email. */
export function getLeadDuplicates(id: string) {
  return apiClient.get<LeadDuplicatesResponse>(`/leads/${id}/duplicates`);
}

/** Merge `sourceLeadId` into `targetLeadId`; the target survives. */
export function mergeLeads({ targetLeadId, ...body }: MergeLeadsInput) {
  return apiClient.post<LeadMergeResult>(`/leads/${targetLeadId}/merge`, body);
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

export interface LostReasonInput {
  lostReasonId?: string;
  lostNote?: string;
}

/** A move to a Won stage must carry the deal details (`deal`). */
export function moveLeadStage(
  id: string,
  pipelineStageId: string,
  lost?: LostReasonInput,
  deal?: DealDetailsInput,
) {
  return apiClient.post<Lead>(`/leads/${id}/move-stage`, {
    pipelineStageId,
    ...lost,
    ...(deal ? { deal } : {}),
  });
}

/** Which leads a bulk action targets: explicit ids or "all matching". */
export type LeadSelection =
  | { leadIds: string[] }
  | { filters: LeadSelectionFilters };

export function bulkAssignLeads(selection: LeadSelection, userId: string | null) {
  return apiClient.post<BulkLeadActionResult>("/leads/bulk/assign", {
    ...selection,
    userId,
  });
}

export function bulkMoveLeadsStage(
  selection: LeadSelection,
  targetStageId: string,
  lost?: LostReasonInput,
) {
  return apiClient.post<BulkLeadActionResult>("/leads/bulk/move-stage", {
    ...selection,
    targetStageId,
    ...lost,
  });
}

export interface TransferInput {
  fromUserId: string;
  toUserIds: string[];
  distribution?: "EVEN" | "BALANCE";
  filters?: LeadSelectionFilters;
}

export interface TransferPreview {
  leadCount: number;
  hotLeads: number;
  overdueLeads: number;
  openTasks: number;
  byStage: Array<{ stageId: string; name: string; color: string | null; icon: string | null; count: number }>;
  allocations: Array<{ userId: string; name: string; currentOpenLeads: number; leadCount: number }>;
}

export interface UserWorkload {
  userId: string;
  name: string;
  role: string | null;
  openLeads: number;
  hotLeads: number;
  overdue: number;
  noNextStep: number;
  openTasks: number;
  wonLast30Days: number;
}

export function getTeamWorkload() {
  return apiClient.get<UserWorkload[]>("/leads/bulk/workload");
}

export function previewTransfer(input: TransferInput) {
  return apiClient.post<TransferPreview>("/leads/bulk/transfer/preview", input);
}

export function bulkTransferLeads(input: TransferInput) {
  return apiClient.post<BulkLeadActionResult & { allocations: TransferPreview["allocations"] }>(
    "/leads/bulk/transfer",
    input,
  );
}

export function getLostReasons(includeInactive = false) {
  return apiClient.get<LostReason[]>("/lost-reasons", {
    query: includeInactive ? { includeInactive: "true" } : {},
  });
}

export async function getLeadAttachments(leadId: string) {
  const data = await apiClient.get<{ items: LeadAttachment[] }>(`/leads/${leadId}/attachments`);
  return data.items;
}

export function getLeadInteractions(leadId: string) {
  return apiClient.get<LeadInteraction[]>(`/leads/${leadId}/interactions`);
}

export function logLeadInteraction(leadId: string, input: LogInteractionInput) {
  return apiClient.post<LogInteractionResult>(
    `/leads/${leadId}/interactions`,
    input,
  );
}

export function getLeadTasks(leadId: string) {
  return apiClient.get<PaginatedResponse<LeadTask>>("/tasks", {
    query: { leadId, status: "OPEN", limit: 20 },
  });
}

export function rescheduleTask(
  taskId: string,
  input: { dueAt: string; reason?: string },
) {
  return apiClient.patch<LeadTask>(`/tasks/${taskId}`, input);
}

export function skipTask(taskId: string, reason: string) {
  return apiClient.post<LeadTask>(`/tasks/${taskId}/skip`, { reason });
}

export function completeTask(taskId: string, note?: string) {
  return apiClient.post<LeadTask>(`/tasks/${taskId}/complete`, { note });
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
  icon: string | null;
  isClosed: boolean;
  closeType: "WON" | "LOST" | null;
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
