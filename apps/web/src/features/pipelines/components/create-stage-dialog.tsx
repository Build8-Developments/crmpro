"use client";

import { StageBadge, StageIconPicker } from "@/components/crm/stage-visuals";
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
import { useCreateStage } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import {
  getDefaultInsertSortOrder,
  STAGE_COLOR_PRESETS,
} from "@/features/pipelines/utils/pipeline-stage";
import {
  StageRuleFields,
  stageRuleError,
  stageRuleInput,
  type StageRuleDraft,
} from "@/features/pipelines/components/stage-rule-fields";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

/** Same default as the API: revive after 7 days, no stuck review. */
const NEW_STAGE_RULES: StageRuleDraft = { staleAfterDays: "7", stuckAfterDays: "" };

export function CreateStageDialog() {
  const createStagePipelineId = usePipelineUiStore(
    (s) => s.createStagePipelineId,
  );
  const closeCreateStage = usePipelineUiStore((s) => s.closeCreateStage);
  const { data: listData } = usePipelines();
  const { data: pipelineDetail } = usePipeline(createStagePipelineId ?? undefined);
  const createStage = useCreateStage();
  const { can } = usePermissions();

  const pipeline =
    pipelineDetail ??
    listData?.items.find((item) => item.id === createStagePipelineId);
  const open = Boolean(createStagePipelineId && pipeline);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(STAGE_COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string | null>("circle-check");
  const [rules, setRules] = useState<StageRuleDraft>(NEW_STAGE_RULES);
  const rulesError = stageRuleError(rules);

  const handleClose = () => {
    closeCreateStage();
    setName("");
    setColor(STAGE_COLOR_PRESETS[0]);
    setIcon("circle-check");
    setRules(NEW_STAGE_RULES);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createStagePipelineId || !pipeline) return;

    const trimmed = name.trim();
    if (!trimmed || rulesError) return;

    await createStage.mutateAsync({
      pipelineId: createStagePipelineId,
      input: {
        name: trimmed,
        sortOrder: getDefaultInsertSortOrder(pipeline.stages),
        color,
        icon,
        isClosed: false,
        ...stageRuleInput(rules),
      },
    });

    handleClose();
  };

  if (!can("pipeline.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add stage</DialogTitle>
          <DialogDescription>
            Insert a new open stage before Won/Lost in &quot;{pipeline?.name}
            &quot;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Stage name</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Follow-up"
              required
              autoFocus
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground">Preview</span>
            <StageBadge stage={{ name: name.trim() || "New stage", color, icon }} />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <StageIconPicker value={icon} color={color} onChange={setIcon} />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {STAGE_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={cn(
                    "size-7 rounded-md border-2 transition-transform hover:scale-105",
                    color === preset
                      ? "border-foreground ring-2 ring-ring/30"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: preset }}
                  onClick={() => setColor(preset)}
                  aria-label={`Color ${preset}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-12 cursor-pointer p-1"
              />
              <Input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <StageRuleFields value={rules} onChange={setRules} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createStage.isPending || !name.trim() || Boolean(rulesError)}
            >
              {createStage.isPending ? "Adding..." : "Add stage"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
