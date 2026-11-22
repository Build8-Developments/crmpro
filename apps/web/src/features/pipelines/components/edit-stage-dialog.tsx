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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePipeline, usePipelines } from "@/features/pipelines/hooks";
import { useUpdateStage } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { STAGE_COLOR_PRESETS } from "@/features/pipelines/utils/pipeline-stage";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { StageBadge, StageIconPicker } from "@/components/crm/stage-visuals";
import {
  StageRuleFields,
  stageRuleDraft,
  stageRuleError,
  stageRuleInput,
  type StageRuleDraft,
} from "@/features/pipelines/components/stage-rule-fields";

export function EditStageDialog() {
  const editStage = usePipelineUiStore((s) => s.editStage);
  const closeEditStage = usePipelineUiStore((s) => s.closeEditStage);
  const { data: listData } = usePipelines();
  const { data: pipelineDetail } = usePipeline(editStage?.pipelineId);
  const updateStage = useUpdateStage();
  const { can } = usePermissions();

  const pipeline =
    pipelineDetail ??
    listData?.items.find((item) => item.id === editStage?.pipelineId);
  const stage = pipeline?.stages.find((item) => item.id === editStage?.stageId);
  const open = Boolean(editStage && pipeline && stage);

  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(STAGE_COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string | null>(null);
  const [rules, setRules] = useState<StageRuleDraft>(() => stageRuleDraft());

  // Load once per opened stage (during render, not in an effect).
  const formKey = stage ? stage.id : null;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  if (formKey !== loadedKey) {
    setLoadedKey(formKey);
    if (stage) {
      setName(stage.name);
      setColor(stage.color ?? STAGE_COLOR_PRESETS[0]);
      setIcon(stage.icon);
      setRules(stageRuleDraft(stage));
    }
  }

  const isSystem = stage?.isSystem ?? false;
  // Won/Lost stages never go stale or get stuck.
  const isOpenStage = stage ? !stage.isClosed : false;
  const rulesError = isOpenStage ? stageRuleError(rules) : null;

  const handleClose = () => {
    closeEditStage();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editStage || !stage) return;

    const trimmed = name.trim();
    if (!trimmed || rulesError) return;

    await updateStage.mutateAsync({
      pipelineId: editStage.pipelineId,
      stageId: editStage.stageId,
      input: {
        name: trimmed,
        color,
        icon,
        ...(isOpenStage ? stageRuleInput(rules) : {}),
      },
    });

    handleClose();
  };

  const description = useMemo(() => {
    if (!stage) return "";
    if (stage.closeType === "WON") return "Won stage — name, icon and color.";
    if (stage.closeType === "LOST") return "Lost stage — name, icon and color.";
    return "How this stage looks everywhere, and when its leads need attention.";
  }, [stage]);

  if (!can("pipeline.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit stage</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-stage-name">Stage name</Label>
            <Input
              id="edit-stage-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <span className="text-xs text-muted-foreground">Preview</span>
            <StageBadge stage={{ name: name.trim() || "Stage", color, icon, closeType: stage?.closeType }} />
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

          {isOpenStage ? <StageRuleFields value={rules} onChange={setRules} /> : null}

          {isSystem ? (
            <p className="text-xs text-muted-foreground">
              System stages cannot be deleted or reordered when they are Won/Lost.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateStage.isPending || !name.trim() || Boolean(rulesError)}
            >
              {updateStage.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
