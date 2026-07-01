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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectDuplicateHint } from "@/features/projects/components/project-duplicate-hint";
import { useProjectDeveloperOptions } from "@/features/projects/hooks/use-project-developer-options";
import { useProjectNameDuplicate } from "@/features/projects/hooks/use-project-name-duplicate";
import { useCreateProject } from "@/features/projects/mutations";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface CreateProjectDialogProps {
  defaultDeveloperId?: string | null;
}

export function CreateProjectDialog({
  defaultDeveloperId,
}: CreateProjectDialogProps) {
  const open = useProjectUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useProjectUiStore((s) => s.closeCreateDialog);
  const { can } = usePermissions();

  const handleClose = () => {
    closeCreateDialog();
  };

  if (!can("project.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Add a real estate project linked to a developer.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CreateProjectForm
            key={defaultDeveloperId ?? "none"}
            defaultDeveloperId={defaultDeveloperId ?? undefined}
            onClose={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateProjectForm({
  defaultDeveloperId,
  onClose,
}: {
  defaultDeveloperId?: string;
  onClose: () => void;
}) {
  const createProject = useCreateProject();
  const { data: developersData, isLoading: developersLoading } =
    useProjectDeveloperOptions();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [developerId, setDeveloperId] = useState(defaultDeveloperId);
  const duplicate = useProjectNameDuplicate(name);

  const developerOptions = developersData?.items ?? [];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!developerId) return;

    const trimmedName = name.trim();
    if (!trimmedName) return;

    await createProject.mutateAsync({
      developerId,
      name: trimmedName,
      ...(location.trim() ? { location: location.trim() } : {}),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-developer">Developer</Label>
        <Select
          value={developerId}
          onValueChange={setDeveloperId}
          disabled={developersLoading}
        >
          <SelectTrigger id="project-developer">
            <SelectValue placeholder="Select developer" />
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
        <Label htmlFor="project-name">Name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Mountain View iCity"
          required
          minLength={2}
          maxLength={150}
          autoFocus
        />
        <ProjectDuplicateHint duplicate={duplicate} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-location">Location (optional)</Label>
        <Input
          id="project-location"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="New Cairo"
          maxLength={255}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            createProject.isPending ||
            !developerId ||
            name.trim().length < 2 ||
            Boolean(duplicate)
          }
        >
          {createProject.isPending ? "Creating..." : "Create project"}
        </Button>
      </DialogFooter>
    </form>
  );
}
