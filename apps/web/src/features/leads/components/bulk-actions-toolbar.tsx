"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatNumber } from "@/lib/format";
import {
  useBulkArchiveLeads,
  useBulkRestoreLeads,
} from "@/features/leads/mutations";
import { useLeadsTableStore } from "@/features/leads/stores/leads-table-store";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { LeadSelectionFilters } from "@/features/leads/types";
import { usePermissions } from "@/hooks/use-permissions";

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedLeadIds: string[];
  assignableLeadIds: string[];
  movableLeadIds: string[];
  archivableLeadIds: string[];
  restorableLeadIds: string[];
  bulkPipelineId?: string;
  /** Every row on the current page is selected. */
  pageFullySelected: boolean;
  /** Leads matching the current filters (all pages). */
  totalMatching: number;
  matchingFilters: LeadSelectionFilters;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedLeadIds,
  assignableLeadIds,
  movableLeadIds,
  archivableLeadIds,
  restorableLeadIds,
  bulkPipelineId,
  pageFullySelected,
  totalMatching,
  matchingFilters,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const selectAllMatching = useLeadsTableStore((s) => s.selectAllMatching);
  const setSelectAllMatching = useLeadsTableStore((s) => s.setSelectAllMatching);
  const bulkArchive = useBulkArchiveLeads();
  const bulkRestore = useBulkRestoreLeads();
  const { can } = usePermissions();

  const matching = selectAllMatching
    ? { filters: matchingFilters, count: totalMatching }
    : undefined;
  const effectiveCount = matching ? totalMatching : selectedCount;
  const matchingPipelineId = matchingFilters.pipelineId;
  const pending = bulkArchive.isPending || bulkRestore.isPending;

  const handleBulkAssign = () => {
    if (matching) {
      openAssignDialog([], matching);
      return;
    }
    if (assignableLeadIds.length === 0) {
      toast.error("Archived leads cannot be assigned");
      return;
    }
    const skipped = selectedLeadIds.length - assignableLeadIds.length;
    if (skipped > 0) toast.info(`${skipped} archived lead(s) will be skipped`);
    openAssignDialog(assignableLeadIds);
  };

  const handleBulkMove = () => {
    if (matching) {
      if (!matchingPipelineId) {
        toast.info("Filter by a pipeline first to move every matching lead");
        return;
      }
      openMoveStageDialog([], matchingPipelineId, matching);
      return;
    }
    if (movableLeadIds.length === 0) {
      toast.error("Archived leads cannot be moved");
      return;
    }
    if (!bulkPipelineId) return;
    const skipped = selectedLeadIds.length - movableLeadIds.length;
    if (skipped > 0) toast.info(`${skipped} archived lead(s) will be skipped`);
    openMoveStageDialog(movableLeadIds, bulkPipelineId);
  };

  const handleBulkArchive = async () => {
    if (archivableLeadIds.length === 0) return;
    await bulkArchive.mutateAsync(archivableLeadIds);
    onClearSelection();
  };

  const handleBulkRestore = async () => {
    if (restorableLeadIds.length === 0) return;
    await bulkRestore.mutateAsync(restorableLeadIds);
    onClearSelection();
  };

  if (selectedCount === 0) return null;

  const canOfferAllMatching =
    pageFullySelected && totalMatching > selectedCount && !selectAllMatching;

  return (
    <div className="border-b border-border/50 bg-primary/[0.04] motion-safe:animate-slide-in [--slide:0]">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2">
        <p className="text-xs font-medium text-foreground">
          {matching
            ? `All ${formatNumber(totalMatching)} matching leads selected`
            : `${formatNumber(selectedCount)} selected`}
        </p>
        {canOfferAllMatching ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-7 px-1 text-xs"
            onClick={() => setSelectAllMatching(true)}
          >
            Select all {formatNumber(totalMatching)} matching
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClearSelection}
        >
          Clear
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {can("lead.assign") && (matching || assignableLeadIds.length > 0) ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleBulkAssign}
            >
              <AppIcons.userPlus className="size-3.5" />
              Assign {matching ? formatNumber(effectiveCount) : ""}
            </Button>
          ) : null}
          {can("lead.update") &&
          (matching ? true : movableLeadIds.length > 0 && bulkPipelineId) ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleBulkMove}
            >
              <AppIcons.stageChange className="size-3.5" />
              Move stage
            </Button>
          ) : null}
          {!matching && can("lead.update") && archivableLeadIds.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pending}
              onClick={() => void handleBulkArchive()}
            >
              <AppIcons.archive className="size-3.5" />
              Archive
            </Button>
          ) : null}
          {!matching && can("lead.update") && restorableLeadIds.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={pending}
              onClick={() => void handleBulkRestore()}
            >
              Restore
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
