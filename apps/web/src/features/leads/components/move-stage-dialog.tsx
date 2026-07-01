"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { useBulkMoveLeadsStage, useMoveLeadStage } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { StageColorDot } from "@/features/leads/utils/stage-color";

export function MoveStageDialog() {
  const moveStageDialog = useLeadUiStore((s) => s.moveStageDialog);
  const closeMoveStageDialog = useLeadUiStore((s) => s.closeMoveStageDialog);
  const { pipelines } = useLeadFilterOptions();
  const moveStage = useMoveLeadStage();
  const bulkMoveStage = useBulkMoveLeadsStage();
  const { can } = usePermissions();
  const [stageId, setStageId] = useState<string>();

  const open = Boolean(moveStageDialog);
  const leadIds = moveStageDialog?.leadIds ?? [];
  const pipelineId = moveStageDialog?.pipelineId;
  const isBulk = leadIds.length > 1;
  const pending = moveStage.isPending || bulkMoveStage.isPending;

  const stageOptions = useMemo(() => {
    if (!pipelineId) return [];
    return (
      pipelines.data
        ?.find((pipeline) => pipeline.id === pipelineId)
        ?.stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
        })) ?? []
    );
  }, [pipelineId, pipelines.data]);

  const handleClose = () => {
    closeMoveStageDialog();
    setStageId(undefined);
  };

  const handleSubmit = async () => {
    if (!stageId || !leadIds.length) return;

    if (isBulk) {
      await bulkMoveStage.mutateAsync({ leadIds, targetStageId: stageId });
    } else {
      await moveStage.mutateAsync({
        leadId: leadIds[0],
        pipelineStageId: stageId,
      });
    }

    handleClose();
  };

  if (!can("lead.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? `Move ${leadIds.length} leads` : "Move stage"}
          </DialogTitle>
          <DialogDescription>
            Select the pipeline stage for{" "}
            {isBulk ? "the selected leads" : "this lead"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Stage</Label>
          <Select value={stageId} onValueChange={setStageId}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {stageOptions.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <span className="inline-flex items-center gap-2">
                    <StageColorDot color={stage.color} />
                    {stage.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={pending || !stageId}
          >
            {pending ? "Saving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
