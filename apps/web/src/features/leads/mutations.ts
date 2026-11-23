"use client";

import {
  assignLead,
  bulkAssignLeads,
  bulkMoveLeadsStage,
  bulkTransferLeads,
  completeTask,
  createLead,
  createLeadNote,
  logLeadInteraction,
  mergeLeads,
  moveLeadStage,
  rescheduleTask,
  skipTask,
  updateLead,
  type LeadSelection,
  type TransferInput,
  type LostReasonInput,
} from "@/features/leads/api";
import type {
  CreateLeadInput,
  LeadSelectionFilters,
  LogInteractionInput,
  MergeLeadsInput,
  UpdateLeadInput,
} from "@/features/leads/types";
import { notifyDuplicateWarning } from "@/features/leads/utils/duplicate-warning";
import type { DealDetailsInput } from "@/features/deals/types";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

function bulkResultMessage(
  verb: string,
  result: { successCount: number; failureCount: number },
): string {
  const done = `${result.successCount} lead${result.successCount === 1 ? "" : "s"} ${verb}`;
  return result.failureCount > 0 ? `${done}, ${result.failureCount} skipped` : done;
}

const leadInvalidateKeys = [
  queryKeys.leads.all(),
  queryKeys.dashboard.all(),
  queryKeys.today(),
] as const;

async function bulkUpdateLeadStatus(
  leadIds: string[],
  status: "OPEN" | "ARCHIVED",
): Promise<void> {
  const results = await Promise.allSettled(
    leadIds.map((leadId) => updateLead(leadId, { status })),
  );
  const failureCount = results.filter(
    (result) => result.status === "rejected",
  ).length;

  if (failureCount > 0) {
    throw new Error(
      `Failed to update ${failureCount} of ${leadIds.length} lead(s)`,
    );
  }
}

export function useCreateLead() {
  return useApiMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    successMessage: "Lead created",
    invalidateKeys: [...leadInvalidateKeys],
    onSuccess: (result) => {
      notifyDuplicateWarning(result.duplicateWarning);
    },
  });
}

export function useUpdateLead() {
  return useApiMutation({
    mutationFn: ({
      leadId,
      input,
    }: {
      leadId: string;
      input: UpdateLeadInput;
    }) => updateLead(leadId, input),
    successMessage: "Lead updated",
    invalidateKeys: [...leadInvalidateKeys],
    onSuccess: (result) => {
      notifyDuplicateWarning(result.duplicateWarning);
    },
  });
}

/** Lead, lists, Today and dashboard all refresh (tasks may have moved). */
export function useMergeLeads() {
  return useApiMutation({
    mutationFn: (input: MergeLeadsInput) => mergeLeads(input),
    successMessage: "Leads merged",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useAssignLead() {
  return useApiMutation({
    mutationFn: ({
      leadId,
      userId,
    }: {
      leadId: string;
      userId: string | null;
    }) => assignLead(leadId, userId),
    successMessage: "Lead assigned",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

/** Clear wording for the stage-move rules the API enforces. */
function stageMoveErrorMessage(error: Error): string {
  if (!(error instanceof ApiError)) return "Could not move the lead.";
  switch (error.code) {
    case "DEAL_ACTIVE":
      return "This lead has an active deal. Cancel the deal from the lead first — that re-opens it.";
    case "DEAL_REQUIRED":
      return "Add the deal details (unit type and price) to win this lead.";
    case "LOST_REASON_REQUIRED":
      return "Choose why this lead was lost.";
    default:
      return error.message;
  }
}

export function useMoveLeadStage() {
  return useApiMutation({
    mutationFn: ({
      leadId,
      pipelineStageId,
      lost,
      deal,
    }: {
      leadId: string;
      pipelineStageId: string;
      lost?: LostReasonInput;
      /** Required when the target is a Won stage. */
      deal?: DealDetailsInput;
    }) => moveLeadStage(leadId, pipelineStageId, lost, deal),
    invalidateKeys: [...leadInvalidateKeys],
    onSuccess: (_data, variables) => {
      toast.success(variables.deal ? "Lead won — deal recorded" : "Stage updated");
    },
    showErrorToast: false,
    onError: (error) => toast.error(stageMoveErrorMessage(error)),
  });
}

export function useArchiveLead() {
  return useApiMutation({
    mutationFn: (leadId: string) =>
      updateLead(leadId, { status: "ARCHIVED" }),
    successMessage: "Lead archived",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useRestoreLead() {
  return useApiMutation({
    mutationFn: (leadId: string) => updateLead(leadId, { status: "OPEN" }),
    successMessage: "Lead restored",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkArchiveLeads() {
  return useApiMutation({
    mutationFn: (leadIds: string[]) =>
      bulkUpdateLeadStatus(leadIds, "ARCHIVED"),
    successMessage: "Leads archived",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkRestoreLeads() {
  return useApiMutation({
    mutationFn: (leadIds: string[]) => bulkUpdateLeadStatus(leadIds, "OPEN"),
    successMessage: "Leads restored",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkAssignLeads() {
  return useApiMutation({
    mutationFn: ({
      selection,
      userId,
    }: {
      selection: LeadSelection;
      userId: string | null;
    }) => bulkAssignLeads(selection, userId),
    successMessage: (result) => bulkResultMessage("assigned", result),
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkMoveLeadsStage() {
  return useApiMutation({
    mutationFn: ({
      selection,
      targetStageId,
      lost,
    }: {
      selection: LeadSelection;
      targetStageId: string;
      lost?: LostReasonInput;
    }) => bulkMoveLeadsStage(selection, targetStageId, lost),
    successMessage: (result) => bulkResultMessage("moved", result),
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useCreateLeadNote(leadId: string) {
  return useApiMutation({
    mutationFn: (content: string) => createLeadNote(leadId, content),
    successMessage: "Note added",
    invalidateKeys: [
      queryKeys.leads.detail(leadId),
      ...leadInvalidateKeys,
    ],
  });
}

export function useBulkTransferLeads() {
  return useApiMutation({
    mutationFn: (input: TransferInput) => bulkTransferLeads(input),
    successMessage: (result) => bulkResultMessage("transferred", result),
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useLogInteraction(leadId: string) {
  return useApiMutation({
    mutationFn: (input: LogInteractionInput) => logLeadInteraction(leadId, input),
    successMessage: (result) =>
      result.nextTask ? "Logged — next step scheduled" : "Interaction logged",
    invalidateKeys: [queryKeys.leads.detail(leadId), ...leadInvalidateKeys],
  });
}

export function useRescheduleTask(leadId?: string) {
  return useApiMutation({
    mutationFn: ({ taskId, dueAt, reason }: { taskId: string; dueAt: string; reason?: string }) =>
      rescheduleTask(taskId, { dueAt, reason }),
    successMessage: "Task moved",
    invalidateKeys: [
      ...(leadId ? [queryKeys.leads.detail(leadId)] : []),
      ...leadInvalidateKeys,
    ],
  });
}

export function useSkipTask(leadId?: string) {
  return useApiMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      skipTask(taskId, reason),
    successMessage: "Task skipped",
    invalidateKeys: [
      ...(leadId ? [queryKeys.leads.detail(leadId)] : []),
      ...leadInvalidateKeys,
    ],
  });
}

export function useCompleteTask(leadId?: string) {
  return useApiMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note?: string }) =>
      completeTask(taskId, note),
    successMessage: "Task done",
    invalidateKeys: [
      ...(leadId ? [queryKeys.leads.detail(leadId)] : []),
      ...leadInvalidateKeys,
    ],
  });
}
