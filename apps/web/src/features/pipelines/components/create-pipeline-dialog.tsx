"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCreatePipeline } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function CreatePipelineDialog() {
  const open = usePipelineUiStore((s) => s.createPipelineOpen);
  const closeCreatePipeline = usePipelineUiStore((s) => s.closeCreatePipeline);
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );
  const createPipeline = useCreatePipeline();
  const { can } = usePermissions();
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const handleClose = () => {
    closeCreatePipeline();
    setName("");
    setIsDefault(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const pipeline = await createPipeline.mutateAsync({
      name: trimmed,
      ...(isDefault ? { isDefault: true } : {}),
    });

    setSelectedPipelineId(pipeline.id);
    handleClose();
  };

  if (!can("pipeline.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New pipeline</DialogTitle>
          <DialogDescription>
            Creates a pipeline with default stages (New Lead through Won/Lost).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline-name">Name</Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sales pipeline"
              required
              autoFocus
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <span>Set as default pipeline</span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPipeline.isPending || !name.trim()}
            >
              {createPipeline.isPending ? "Creating..." : "Create pipeline"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
