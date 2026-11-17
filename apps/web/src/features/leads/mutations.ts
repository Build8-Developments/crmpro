"use client";

import {
  archiveLead,
  assignLead,
  bulkArchiveLeads,
  bulkAssignLeads,
  bulkMoveLeadsStage,
  bulkRestoreLeads,
  createLead,
  createLeadNote,
  deleteLead,
  logLeadActivity,
  moveLeadStage,
  restoreLead,
  updateLead,
} from "@/features/leads/api";
import type { BulkLeadActionResult, LogLeadActivityInput } from "@/features/leads/types";
import { useTranslations } from "next-intl";
import type { CreateLeadInput, UpdateLeadInput } from "@/features/leads/types";
import { notifyDuplicateWarning } from "@/features/leads/utils/duplicate-warning";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const leadInvalidateKeys = [
  queryKeys.leads.all(),
  queryKeys.dashboard.all(),
] as const;

/** The bulk endpoints report per-lead failures instead of throwing. */
function assertBulkSucceeded(result: BulkLeadActionResult, total: number) {
  if (result.failureCount > 0) {
    throw new Error(`Failed to update ${result.failureCount} of ${total} lead(s)`);
  }
}

export function useCreateLead() {
  const tDuplicate = useTranslations("leads.duplicate");

  return useApiMutation({
    mutationFn: (input: CreateLeadInput) => createLead(input),
    successMessage: "Lead created",
    invalidateKeys: [...leadInvalidateKeys],
    onSuccess: (result) => {
      notifyDuplicateWarning(result.duplicateWarning, tDuplicate);
    },
  });
}

export function useUpdateLead() {
  const tDuplicate = useTranslations("leads.duplicate");

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
      notifyDuplicateWarning(result.duplicateWarning, tDuplicate);
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
    mutationFn: (leadId: string) => archiveLead(leadId),
    successMessage: "Lead archived",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useRestoreLead() {
  return useApiMutation({
    mutationFn: (leadId: string) => restoreLead(leadId),
    successMessage: "Lead restored",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkArchiveLeads() {
  return useApiMutation({
    mutationFn: async (leadIds: string[]) =>
      assertBulkSucceeded(await bulkArchiveLeads(leadIds), leadIds.length),
    successMessage: "Leads archived",
    invalidateKeys: [...leadInvalidateKeys],
  });
}

export function useBulkRestoreLeads() {
  return useApiMutation({
    mutationFn: async (leadIds: string[]) =>
      assertBulkSucceeded(await bulkRestoreLeads(leadIds), leadIds.length),
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

export function useDeleteLead() {
  const t = useTranslations("leads.lifecycle");

  return useApiMutation({
    mutationFn: (leadId: string) => deleteLead(leadId),
    successMessage: t("deleted"),
    invalidateKeys: [...leadInvalidateKeys, queryKeys.tasks.all()],
  });
}

export function useLogLeadActivity(leadId: string) {
  const t = useTranslations("activity.toast");

  return useApiMutation({
    mutationFn: (input: LogLeadActivityInput) => logLeadActivity(leadId, input),
    successMessage: t("logged"),
    invalidateKeys: [
      queryKeys.leads.detail(leadId),
      ...leadInvalidateKeys,
      queryKeys.tasks.all(),
    ],
  });
}
