"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePipeline, usePipelines } from "@/features/pipelines/hooks";
import { useDeletePipeline } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function DeletePipelineDialog() {
  const deletePipelineId = usePipelineUiStore((s) => s.deletePipelineId);
  const closeDeletePipeline = usePipelineUiStore((s) => s.closeDeletePipeline);
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );
  const { data: listData } = usePipelines();
  const { data: pipelineDetail } = usePipeline(deletePipelineId ?? undefined);
  const deletePipeline = useDeletePipeline();
  const { can } = usePermissions();
  const [confirmName, setConfirmName] = useState("");

  const pipeline =
    pipelineDetail ??
    listData?.items.find((item) => item.id === deletePipelineId);
  const open = Boolean(deletePipelineId && pipeline);

  const handleClose = () => {
    closeDeletePipeline();
    setConfirmName("");
  };

  const handleDelete = async () => {
    if (!deletePipelineId || !pipeline) return;

    await deletePipeline.mutateAsync(deletePipelineId);

    const remaining = listData?.items.filter(
      (item) => item.id !== deletePipelineId,
    );
    const next =
      remaining?.find((item) => item.isDefault) ?? remaining?.[0] ?? null;
    setSelectedPipelineId(next?.id ?? null);
    handleClose();
  };

  if (!can("pipeline.delete")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete pipeline</DialogTitle>
          <DialogDescription>
            This permanently removes &quot;{pipeline?.name}&quot;. The pipeline
            must have no leads and cannot be the default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-pipeline-name">
            Type <span className="font-medium">{pipeline?.name}</span> to confirm
          </Label>
          <Input
            id="confirm-pipeline-name"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={pipeline?.name}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              deletePipeline.isPending ||
              confirmName.trim() !== pipeline?.name
            }
            onClick={() => void handleDelete()}
          >
            {deletePipeline.isPending ? "Deleting..." : "Delete pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
