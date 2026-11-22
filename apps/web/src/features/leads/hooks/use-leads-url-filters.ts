"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import { useLeadsTableStore } from "@/features/leads/stores/leads-table-store";
import type { LeadStatus } from "@/features/leads/types";

function parseBooleanParam(value: string | null): boolean {
  return value === "true";
}

const LAST_CONTACT_VALUES: ReadonlyArray<string> = [
  "never",
  "over_2d",
  "over_3d",
  "over_7d",
  "over_14d",
  "over_30d",
];

/**
 * Applies filters from the URL (dashboard links, shared links) to the leads
 * table. A URL with filters replaces whatever filters were set before (e.g.
 * left from an earlier visit), so the list shows exactly the leads behind the
 * link. A URL with only `id` / `view` keeps the current filters.
 */
export function useLeadsUrlFilters() {
  const searchParams = useSearchParams();
  const setFilters = useLeadsTableStore((state) => state.setFilters);
  const clearFilters = useLeadsTableStore((state) => state.clearFilters);
  const setLayout = useLeadsTableStore((state) => state.setLayout);
  const openDrawer = useLeadUiStore((state) => state.openDrawer);
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || appliedRef.current === signature) {
      return;
    }

    const partial: Partial<LeadsTableFilters> = {};

    if (parseBooleanParam(searchParams.get("unassigned"))) {
      partial.unassignedOnly = true;
    }
    if (parseBooleanParam(searchParams.get("stale"))) {
      partial.staleOnly = true;
    }
    if (parseBooleanParam(searchParams.get("openOnly"))) partial.openOnly = true;
    if (parseBooleanParam(searchParams.get("stuck"))) partial.stuck = true;
    if (parseBooleanParam(searchParams.get("stageStale"))) partial.stageStale = true;
    if (parseBooleanParam(searchParams.get("assignedOnly"))) partial.assignedOnly = true;
    if (searchParams.get("slaBreached") === "today") partial.slaBreached = "today";

    if (searchParams.get("view") === "board") setLayout("board");

    const leadId = searchParams.get("id");
    if (leadId) {
      openDrawer(leadId);
    }

    const stageId = searchParams.get("stageId");
    if (stageId) partial.stageId = stageId;

    const assignedUserId = searchParams.get("assignedUserId");
    if (assignedUserId) partial.assignees = [assignedUserId];

    const list = (key: string) =>
      searchParams.get(key)?.split(",").filter(Boolean) ?? [];
    if (list("assignees").length) partial.assignees = list("assignees");
    if (list("stageIds").length) partial.stageIds = list("stageIds");
    if (list("sourceIds").length) partial.sourceIds = list("sourceIds");
    const heat = list("heat").filter((h) => h === "HOT" || h === "WARM" || h === "COLD");
    if (heat.length) partial.heat = heat as LeadsTableFilters["heat"];

    const nextStep = searchParams.get("nextStep");
    if (nextStep === "overdue" || nextStep === "today" || nextStep === "none" || nextStep === "scheduled") {
      partial.nextStep = nextStep;
    }
    const lastContact = searchParams.get("lastContact");
    if (lastContact && LAST_CONTACT_VALUES.includes(lastContact)) {
      partial.lastContact = lastContact as LeadsTableFilters["lastContact"];
    }

    const sourceId = searchParams.get("sourceId");
    if (sourceId) partial.sourceId = sourceId;

    const projectId = searchParams.get("projectId");
    if (projectId) partial.projectId = projectId;

    const pipelineId = searchParams.get("pipelineId");
    if (pipelineId) partial.pipelineId = pipelineId;

    const status = searchParams.get("status");
    if (status === "OPEN" || status === "ARCHIVED") {
      partial.status = status as LeadStatus;
    }

    if (Object.keys(partial).length > 0) {
      clearFilters();
      setFilters(partial);
    }

    appliedRef.current = signature;
  }, [searchParams, setFilters, clearFilters, setLayout, openDrawer]);
}
