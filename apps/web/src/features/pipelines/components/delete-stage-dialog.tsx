"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePipeline, usePipelines } from "@/features/pipelines/hooks";
import { useDeleteStage } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function DeleteStageDialog() {
  const deleteStage = usePipelineUiStore((s) => s.deleteStage);
  const closeDeleteStage = usePipelineUiStore((s) => s.closeDeleteStage);
  const { data: listData } = usePipelines();
  const { data: pipelineDetail } = usePipeline(deleteStage?.pipelineId);
  const deleteStageMutation = useDeleteStage();
  const { can } = usePermissions();

  const pipeline =
    pipelineDetail ??
    listData?.items.find((item) => item.id === deleteStage?.pipelineId);
  const stage = pipeline?.stages.find((item) => item.id === deleteStage?.stageId);
  const open = Boolean(deleteStage && pipeline && stage);

  const handleClose = () => {
    closeDeleteStage();
  };

  const handleDelete = async () => {
    if (!deleteStage) return;
    await deleteStageMutation.mutateAsync(deleteStage);
    handleClose();
  };

  if (!can("pipeline.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete stage</DialogTitle>
          <DialogDescription>
            Remove &quot;{stage?.name}&quot; from this pipeline. Stages in use
            by leads cannot be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteStageMutation.isPending}
            onClick={() => void handleDelete()}
          >
            {deleteStageMutation.isPending ? "Deleting..." : "Delete stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
