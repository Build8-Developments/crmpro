"use client";

import type { Project } from "@/features/projects/types";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateProject } from "@/features/projects/mutations";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface ProjectRowActionsProps {
  project: Project;
}

export function ProjectRowActions({ project }: ProjectRowActionsProps) {
  const openEditDialog = useProjectUiStore((s) => s.openEditDialog);
  const openDeleteDialog = useProjectUiStore((s) => s.openDeleteDialog);
  const updateProject = useUpdateProject();
  const { can } = usePermissions();

  const canUpdate = can("project.update");
  const canDelete = can("project.delete");

  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Actions for ${project.name}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {canUpdate ? (
          <DropdownMenuItem onClick={() => openEditDialog(project.id)}>
            Edit
          </DropdownMenuItem>
        ) : null}
        {canUpdate ? (
          <DropdownMenuItem
            onClick={() =>
              void updateProject.mutateAsync({
                projectId: project.id,
                input: { isActive: !project.isActive },
              })
            }
          >
            {project.isActive ? "Mark inactive" : "Mark active"}
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <>
            {canUpdate ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(project.id)}
            >
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
