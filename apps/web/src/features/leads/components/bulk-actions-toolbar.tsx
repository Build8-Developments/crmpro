"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { formatNumber } from "@/lib/format";
import {
  useBulkArchiveLeads,
  useBulkRestoreLeads,
} from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedLeadIds: string[];
  assignableLeadIds: string[];
  movableLeadIds: string[];
  archivableLeadIds: string[];
  restorableLeadIds: string[];
  bulkPipelineId?: string;
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
  onClearSelection,
}: BulkActionsToolbarProps) {
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const bulkArchive = useBulkArchiveLeads();
  const bulkRestore = useBulkRestoreLeads();
  const { can } = usePermissions();

  const skippedArchivedForAssign =
    selectedLeadIds.length - assignableLeadIds.length;
  const skippedArchivedForMove = selectedLeadIds.length - movableLeadIds.length;
  const pending = bulkArchive.isPending || bulkRestore.isPending;

  const handleBulkAssign = () => {
    if (assignableLeadIds.length === 0) {
      toast.error("Archived leads cannot be assigned");
      return;
    }

    if (skippedArchivedForAssign > 0) {
      toast.info(
        `${skippedArchivedForAssign} archived lead(s) will be skipped`,
      );
    }

    openAssignDialog(assignableLeadIds);
  };

  const handleBulkMove = () => {
    if (movableLeadIds.length === 0) {
      toast.error("Archived leads cannot be moved");
      return;
    }

    if (!bulkPipelineId) return;

    if (skippedArchivedForMove > 0) {
      toast.info(
        `${skippedArchivedForMove} archived lead(s) will be skipped`,
      );
    }

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

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2">
      <p className="text-xs font-medium text-foreground">
        {formatNumber(selectedCount)} selected
      </p>
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
        {can("lead.assign") && assignableLeadIds.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleBulkAssign}
          >
            <AppIcons.userPlus className="size-3.5" />
            Assign
            {assignableLeadIds.length < selectedCount
              ? ` (${assignableLeadIds.length})`
              : ""}
          </Button>
        ) : null}
        {can("lead.update") && movableLeadIds.length > 0 && bulkPipelineId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleBulkMove}
          >
            <AppIcons.stageChange className="size-3.5" />
            Move
            {movableLeadIds.length < selectedCount
              ? ` (${movableLeadIds.length})`
              : ""}
          </Button>
        ) : null}
        {can("lead.update") && archivableLeadIds.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pending}
            onClick={() => void handleBulkArchive()}
          >
            Archive
            {archivableLeadIds.length < selectedCount
              ? ` (${archivableLeadIds.length})`
              : ""}
          </Button>
        ) : null}
        {can("lead.update") && restorableLeadIds.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pending}
            onClick={() => void handleBulkRestore()}
          >
            Restore
            {restorableLeadIds.length < selectedCount
              ? ` (${restorableLeadIds.length})`
              : ""}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
