"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import {
  HEAT_OPTIONS,
  INTEREST_LEVEL_OPTIONS,
  LAST_CONTACT_OPTIONS,
  LEAD_STATUS_OPTIONS,
} from "@/features/leads/utils/lead-filters";
import { useLeadFilterOptions, useLostReasons } from "@/features/leads/hooks";
import { formatNumber } from "@/lib/format";
import {
  CONTACT_CHANNEL_LABELS,
  PAYMENT_PREFERENCE_LABELS,
  PURCHASE_PURPOSE_LABELS,
} from "@crmpro/shared";

interface ActiveFilterBadgesProps {
  filters: LeadsTableFilters;
  onFiltersChange: (filters: Partial<LeadsTableFilters>) => void;
}

function summarize(names: string[]): string {
  if (names.length <= 2) return names.join(", ");
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

/**
 * Removable badges for filters set in the sheet or by a link (dashboard).
 * Quick-chip filters (unassigned, next step, never contacted, hot, stale,
 * stuck) show as chips instead.
 */
export function ActiveFilterBadges({ filters, onFiltersChange }: ActiveFilterBadgesProps) {
  const { pipelines, sources, users, projects } = useLeadFilterOptions();
  const lostReasons = useLostReasons();

  const badges: Array<{ key: string; label: string; onRemove: () => void }> = [];
  const add = (key: string, label: string, clear: Partial<LeadsTableFilters>) =>
    badges.push({ key, label, onRemove: () => onFiltersChange(clear) });

  const userName = (id: string) =>
    id === "unassigned" ? "Unassigned" : (users.data?.find((u) => u.id === id)?.name ?? "Agent");
  const stageName = (id: string) =>
    pipelines.data?.flatMap((p) => p.stages).find((s) => s.id === id)?.name ?? "Stage";
  const sourceName = (id: string) => sources.data?.find((s) => s.id === id)?.name ?? "Source";

  if (filters.status) {
    add(
      "status",
      LEAD_STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ?? filters.status,
      { status: undefined },
    );
  }
  if (filters.pipelineId) {
    add(
      "pipeline",
      pipelines.data?.find((p) => p.id === filters.pipelineId)?.name ?? "Pipeline",
      { pipelineId: undefined, stageId: undefined, stageIds: undefined },
    );
  }
  const stageIds = filters.stageIds ?? (filters.stageId ? [filters.stageId] : []);
  if (stageIds.length) {
    add("stages", summarize(stageIds.map(stageName)), { stageIds: undefined, stageId: undefined });
  }
  const sourceIds = filters.sourceIds ?? (filters.sourceId ? [filters.sourceId] : []);
  if (sourceIds.length) {
    add("sources", summarize(sourceIds.map(sourceName)), { sourceIds: undefined, sourceId: undefined });
  }
  const assignees = filters.assignees ?? (filters.assignedUserId ? [filters.assignedUserId] : []);
  if (assignees.length) {
    add("assignees", summarize(assignees.map(userName)), {
      assignees: undefined,
      assignedUserId: undefined,
    });
  }
  if (filters.projectId) {
    add("project", projects.data?.find((p) => p.id === filters.projectId)?.name ?? "Project", {
      projectId: undefined,
    });
  }
  if (filters.interestLevel) {
    add(
      "interest",
      `${INTEREST_LEVEL_OPTIONS.find((o) => o.value === filters.interestLevel)?.label} interest`,
      { interestLevel: undefined },
    );
  }
  const heatChip = filters.heat?.length === 1 && filters.heat[0] === "HOT";
  if (filters.heat?.length && !heatChip) {
    add(
      "heat",
      filters.heat.map((h) => HEAT_OPTIONS.find((o) => o.value === h)?.label).join(" / "),
      { heat: undefined },
    );
  }
  if (filters.lastContact && filters.lastContact !== "never") {
    add(
      "lastContact",
      `Contacted ${LAST_CONTACT_OPTIONS.find((o) => o.value === filters.lastContact)?.label.toLowerCase()}`,
      { lastContact: undefined },
    );
  }
  if (filters.slaBreached === "today") {
    add("slaBreached", "SLA missed today", { slaBreached: undefined });
  }
  if (filters.stageStale) {
    add("stageStale", "Stale for its stage", { stageStale: undefined });
  }
  if (filters.assignedOnly) {
    add("assignedOnly", "Has an owner", { assignedOnly: undefined });
  }
  // The "Never contacted" chip sets openOnly itself.
  if (filters.openOnly && filters.lastContact !== "never") {
    add("openOnly", "Open leads", { openOnly: undefined });
  }
  if (filters.unansweredMin) {
    add("unanswered", `${filters.unansweredMin}+ unanswered`, { unansweredMin: undefined });
  }
  if (filters.lostReasonId) {
    add(
      "lostReason",
      `Lost: ${lostReasons.data?.find((r) => r.id === filters.lostReasonId)?.name ?? "reason"}`,
      { lostReasonId: undefined },
    );
  }
  if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
    const min = filters.budgetMin !== undefined ? formatNumber(filters.budgetMin) : "0";
    const max = filters.budgetMax !== undefined ? formatNumber(filters.budgetMax) : "∞";
    add("budget", `Budget ${min}–${max}`, { budgetMin: undefined, budgetMax: undefined });
  }
  if (filters.purchasePurposes?.length) {
    add("purpose", filters.purchasePurposes.map((v) => PURCHASE_PURPOSE_LABELS[v]).join(" / "), {
      purchasePurposes: undefined,
    });
  }
  if (filters.paymentPreferences?.length) {
    add("payment", `Pays by ${filters.paymentPreferences.map((v) => PAYMENT_PREFERENCE_LABELS[v]).join(" / ")}`, {
      paymentPreferences: undefined,
    });
  }
  if (filters.contactChannelPreferences?.length) {
    add(
      "channel",
      `Prefers ${filters.contactChannelPreferences.map((v) => CONTACT_CHANNEL_LABELS[v]).join(" / ")}`,
      { contactChannelPreferences: undefined },
    );
  }
  if (filters.residenceArea?.trim()) {
    add("residence", `Lives in “${filters.residenceArea.trim()}”`, { residenceArea: undefined });
  }
  if (filters.occupation?.trim()) {
    add("occupation", `Job “${filters.occupation.trim()}”`, { occupation: undefined });
  }
  if (filters.createdFrom || filters.createdTo) {
    add(
      "created",
      `Created ${filters.createdFrom ?? "…"} → ${filters.createdTo ?? "today"}`,
      { createdFrom: undefined, createdTo: undefined },
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge) => (
        <Badge key={badge.key} variant="secondary" className="gap-1 pr-1">
          {badge.label}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="size-4 rounded-full"
            onClick={badge.onRemove}
            aria-label={`Remove ${badge.label} filter`}
          >
            ×
          </Button>
        </Badge>
      ))}
    </div>
  );
}
