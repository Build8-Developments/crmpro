"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
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
    <div
      className={cn(
        "fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-border/80 bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-md",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-200",
      )}
    >
      <span className="text-sm font-medium tabular-nums">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      {can("lead.assign") && assignableLeadIds.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleBulkAssign}
        >
          <AppIcons.userPlus className="size-4" />
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
          onClick={handleBulkMove}
        >
          <AppIcons.stageChange className="size-4" />
          Move stage
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
          disabled={pending}
          onClick={() => void handleBulkRestore()}
        >
          Restore
          {restorableLeadIds.length < selectedCount
            ? ` (${restorableLeadIds.length})`
            : ""}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        Clear selection
      </Button>
    </div>
  );
}
