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
import { useProject, useProjects } from "@/features/projects/hooks";
import { useDeleteProject } from "@/features/projects/mutations";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import { formatNumber } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";

export function DeleteProjectDialog() {
  const deleteProjectId = useProjectUiStore((s) => s.deleteProjectId);
  const closeDeleteDialog = useProjectUiStore((s) => s.closeDeleteDialog);
  const { data: listData } = useProjects();
  const { data: projectDetail } = useProject(deleteProjectId ?? undefined);
  const deleteProject = useDeleteProject();
  const { can } = usePermissions();
  const [confirmName, setConfirmName] = useState("");

  const project =
    projectDetail ??
    listData?.items.find((item) => item.id === deleteProjectId);
  const open = Boolean(deleteProjectId && project);
  const interestedLeadCount = project?.interestedLeadCount ?? 0;

  const handleClose = () => {
    closeDeleteDialog();
    setConfirmName("");
  };

  const handleDelete = async () => {
    if (!deleteProjectId || !project) return;

    await deleteProject.mutateAsync(deleteProjectId);
    handleClose();
  };

  if (!can("project.delete")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            This removes &quot;{project?.name}&quot; from your catalog.
            {interestedLeadCount > 0 ? (
              <>
                {" "}
                {formatNumber(interestedLeadCount)} lead interest record
                {interestedLeadCount === 1 ? "" : "s"} will also be removed.
              </>
            ) : (
              <> Existing lead records are not otherwise affected.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-project-name">
            Type <span className="font-medium">{project?.name}</span> to confirm
          </Label>
          <Input
            id="confirm-project-name"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={project?.name}
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
              deleteProject.isPending || confirmName.trim() !== project?.name
            }
            onClick={() => void handleDelete()}
          >
            {deleteProject.isPending ? "Deleting..." : "Delete project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
