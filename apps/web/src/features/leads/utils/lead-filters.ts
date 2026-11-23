import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import type {
  InterestLevel,
  LeadHeat,
  LeadLastContactFilter,
  LeadNextStepFilter,
  LeadStatus,
} from "@/features/leads/types";

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
  if (filters.openOnly) count += 1;
  if (filters.assignees?.length) count += 1;
  if (filters.stageIds?.length) count += 1;
  if (filters.sourceIds?.length) count += 1;
  if (filters.heat?.length) count += 1;
  if (filters.interestLevel) count += 1;
  if (filters.createdFrom || filters.createdTo) count += 1;
  if (filters.closedFrom || filters.closedTo) count += 1;
  if (filters.lastContact) count += 1;
  if (filters.nextStep) count += 1;
  if (filters.slaBreached) count += 1;
  if (filters.stuck) count += 1;
  if (filters.stageStale) count += 1;
  if (filters.assignedOnly) count += 1;
  if (filters.unansweredMin) count += 1;
  if (filters.lostReasonId) count += 1;
  if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) count += 1;
  if (filters.paymentPreferences?.length) count += 1;
  if (filters.contactChannelPreferences?.length) count += 1;
  if (filters.purchasePurposes?.length) count += 1;
  if (filters.residenceArea?.trim()) count += 1;
  if (filters.occupation?.trim()) count += 1;
  return count;
}

export const HEAT_OPTIONS: { value: LeadHeat; label: string }[] = [
  { value: "HOT", label: "Hot" },
  { value: "WARM", label: "Warm" },
  { value: "COLD", label: "Cold" },
];

export const NEXT_STEP_OPTIONS: { value: LeadNextStepFilter; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "none", label: "No next step" },
  { value: "scheduled", label: "Scheduled" },
];

export const LAST_CONTACT_OPTIONS: { value: LeadLastContactFilter; label: string }[] = [
  { value: "never", label: "Never contacted" },
  { value: "over_2d", label: "Over 2 days ago" },
  { value: "over_3d", label: "Over 3 days ago" },
  { value: "over_7d", label: "Over 7 days ago" },
  { value: "over_14d", label: "Over 14 days ago" },
  { value: "over_30d", label: "Over 30 days ago" },
];

export const UNANSWERED_OPTIONS = [1, 2, 3, 5].map((value) => ({
  value: String(value),
  label: `${value}+ unanswered`,
}));

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

const DAY_VALUE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A created-date bound as a local `yyyy-mm-dd` (date inputs, labels). Bounds
 * are a picked day or an exact timestamp from a dashboard link.
 */
export function createdBoundDay(value: string | undefined): string {
  if (!value) return "";
  if (DAY_VALUE.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const createdDayFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "Created 1 Nov 2026 – 22 Nov 2026", "Created from 1 Nov 2026", "Created until …". */
export function formatCreatedRange(
  from: string | undefined,
  to: string | undefined,
  verb = "Created",
): string {
  const label = (value: string | undefined) => {
    const day = createdBoundDay(value);
    return day ? createdDayFormat.format(new Date(`${day}T00:00:00`)) : null;
  };
  const start = label(from);
  const end = label(to);
  if (start && end) return start === end ? `${verb} ${start}` : `${verb} ${start} – ${end}`;
  if (start) return `${verb} from ${start}`;
  return end ? `${verb} until ${end}` : verb;
}
