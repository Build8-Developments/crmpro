import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import type { InterestLevel, LeadStatus } from "@/features/leads/types";

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "ARCHIVED", label: "Archived" },
];

export const INTEREST_LEVEL_OPTIONS: {
  value: Exclude<InterestLevel, null>;
  label: string;
}[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "HOT", label: "Hot" },
];

export const LEADS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function countActiveLeadFilters(filters: LeadsTableFilters): number {
  let count = 0;
  if (filters.id) count += 1;
  if (filters.pipelineId) count += 1;
  if (filters.stageId) count += 1;
  if (filters.sourceId) count += 1;
  if (filters.assignedUserId) count += 1;
  if (filters.status) count += 1;
  if (filters.projectId) count += 1;
  if (filters.unassignedOnly) count += 1;
  if (filters.staleOnly) count += 1;
  if (filters.neverContacted) count += 1;
  if (filters.noFollowUp) count += 1;
  if (filters.slaBreached) count += 1;
  return count;
}

export function filtersToLabelMap(filters: LeadsTableFilters): string[] {
  const labels: string[] = [];
  if (filters.status) {
    labels.push(
      LEAD_STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ??
        filters.status,
    );
  }
  return labels;
}
