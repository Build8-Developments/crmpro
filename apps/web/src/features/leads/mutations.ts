"use client";

import {
  assignLead,
  bulkAssignLeads,
  bulkMoveLeadsStage,
  createLead,
  createLeadNote,
  moveLeadStage,
  updateLead,
} from "@/features/leads/api";
import type { CreateLeadInput, UpdateLeadInput } from "@/features/leads/types";
import { notifyDuplicateWarning } from "@/features/leads/utils/duplicate-warning";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const leadInvalidateKeys = [
  queryKeys.leads.all(),
  queryKeys.dashboard.all(),
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

export function useMoveLeadStage() {
  return useApiMutation({
    mutationFn: ({
      leadId,
      pipelineStageId,
    }: {
      leadId: string;
      pipelineStageId: string;
    }) => moveLeadStage(leadId, pipelineStageId),
    successMessage: "Stage updated",
    invalidateKeys: [...leadInvalidateKeys],
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
      leadIds,
      userId,
    }: {
      leadIds: string[];
      userId: string | null;
    }) => bulkAssignLeads(leadIds, userId),
    successMessage: "Bulk assign completed",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkMoveLeadsStage() {
  return useApiMutation({
    mutationFn: ({
      leadIds,
      targetStageId,
    }: {
      leadIds: string[];
      targetStageId: string;
    }) => bulkMoveLeadsStage(leadIds, targetStageId),
    successMessage: "Bulk stage move completed",
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
