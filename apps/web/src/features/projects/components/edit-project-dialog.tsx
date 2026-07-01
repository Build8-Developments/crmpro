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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectDuplicateHint } from "@/features/projects/components/project-duplicate-hint";
import { useProject, useProjects } from "@/features/projects/hooks";
import { useProjectDeveloperOptions } from "@/features/projects/hooks/use-project-developer-options";
import { useProjectNameDuplicate } from "@/features/projects/hooks/use-project-name-duplicate";
import { useUpdateProject } from "@/features/projects/mutations";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import type { Project } from "@/features/projects/types";
import { usePermissions } from "@/hooks/use-permissions";

export function EditProjectDialog() {
  const editProjectId = useProjectUiStore((s) => s.editProjectId);
  const closeEditDialog = useProjectUiStore((s) => s.closeEditDialog);
  const { data: listData } = useProjects();
  const { data: projectDetail } = useProject(editProjectId ?? undefined);
  const { can } = usePermissions();

  const project =
    projectDetail ??
    listData?.items.find((item) => item.id === editProjectId);
  const open = Boolean(editProjectId && project);

  const handleClose = () => {
    closeEditDialog();
  };

  if (!can("project.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update project details and availability for new lead interest.
          </DialogDescription>
        </DialogHeader>

        {project ? (
          <EditProjectForm
            key={project.id}
            project={project}
            onClose={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditProjectForm({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const updateProject = useUpdateProject();
  const { data: developersData, isLoading: developersLoading } =
    useProjectDeveloperOptions();
  const [name, setName] = useState(project.name);
  const [location, setLocation] = useState(project.location ?? "");
  const [developerId, setDeveloperId] = useState(project.developer.id);
  const [isActive, setIsActive] = useState(project.isActive);
  const duplicate = useProjectNameDuplicate(name, project.id);

  const developerOptions = developersData?.items ?? [];
  const hasChanges =
    name.trim() !== project.name ||
    developerId !== project.developer.id ||
    (location.trim() || null) !== (project.location ?? null) ||
    isActive !== project.isActive;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    await updateProject.mutateAsync({
      projectId: project.id,
      input: {
        name: trimmedName,
        developerId,
        location: location.trim() ? location.trim() : null,
        isActive,
      },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-project-developer">Developer</Label>
        <Select
          value={developerId}
          onValueChange={setDeveloperId}
          disabled={developersLoading}
        >
          <SelectTrigger id="edit-project-developer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {developerOptions.map((developer) => (
              <SelectItem key={developer.id} value={developer.id}>
                {developer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-project-name">Name</Label>
        <Input
          id="edit-project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={150}
          autoFocus
        />
        <ProjectDuplicateHint duplicate={duplicate} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-project-location">Location</Label>
        <Input
          id="edit-project-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Optional"
          maxLength={255}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <span>Active project</span>
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateProject.isPending ||
            name.trim().length < 2 ||
            !hasChanges ||
            Boolean(duplicate)
          }
        >
          {updateProject.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
