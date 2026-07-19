"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import { LEAD_STATUS_OPTIONS } from "@/features/leads/utils/lead-filters";
import { useLeadFilterOptions } from "@/features/leads/hooks";

interface ActiveFilterBadgesProps {
  filters: LeadsTableFilters;
  onFiltersChange: (filters: Partial<LeadsTableFilters>) => void;
}

export function ActiveFilterBadges({
  filters,
  onFiltersChange,
}: ActiveFilterBadgesProps) {
  const { pipelines, sources, users, projects } = useLeadFilterOptions();

  const badges: Array<{ key: string; label: string; onRemove: () => void }> =
    [];

  // Unassigned / Stale are shown as toolbar chips — skip here to avoid duplicates.

  if (filters.status) {
    const label =
      LEAD_STATUS_OPTIONS.find((option) => option.value === filters.status)
        ?.label ?? filters.status;
    badges.push({
      key: "status",
      label,
      onRemove: () => onFiltersChange({ status: undefined }),
    });
  }

  if (filters.pipelineId) {
    const name =
      pipelines.data?.find((pipeline) => pipeline.id === filters.pipelineId)
        ?.name ?? "Pipeline";
    badges.push({
      key: "pipeline",
      label: name,
      onRemove: () =>
        onFiltersChange({ pipelineId: undefined, stageId: undefined }),
    });
  }

  if (filters.stageId) {
    const pipeline = pipelines.data?.find(
      (item) => item.id === filters.pipelineId,
    );
    const stageName =
      pipeline?.stages.find((stage) => stage.id === filters.stageId)?.name ??
      "Stage";
    badges.push({
      key: "stage",
      label: stageName,
      onRemove: () => onFiltersChange({ stageId: undefined }),
    });
  }

  if (filters.sourceId) {
    const name =
      sources.data?.find((source) => source.id === filters.sourceId)?.name ??
      "Source";
    badges.push({
      key: "source",
      label: name,
      onRemove: () => onFiltersChange({ sourceId: undefined }),
    });
  }

  if (filters.assignedUserId) {
    const name =
      users.data?.find((user) => user.id === filters.assignedUserId)?.name ??
      "Agent";
    badges.push({
      key: "agent",
      label: name,
      onRemove: () => onFiltersChange({ assignedUserId: undefined }),
    });
  }

  if (filters.projectId) {
    const name =
      projects.data?.find((project) => project.id === filters.projectId)
        ?.name ?? "Project";
    badges.push({
      key: "project",
      label: name,
      onRemove: () => onFiltersChange({ projectId: undefined }),
    });
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
