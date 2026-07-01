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

export function useLeadsUrlFilters() {
  const searchParams = useSearchParams();
  const setFilters = useLeadsTableStore((state) => state.setFilters);
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

    const leadId = searchParams.get("id");
    if (leadId) {
      openDrawer(leadId);
    }

    const stageId = searchParams.get("stageId");
    if (stageId) partial.stageId = stageId;

    const assignedUserId = searchParams.get("assignedUserId");
    if (assignedUserId) partial.assignedUserId = assignedUserId;

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
      setFilters(partial);
    }

    appliedRef.current = signature;
  }, [searchParams, setFilters, openDrawer]);
}
