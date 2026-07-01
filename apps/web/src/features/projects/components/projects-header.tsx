"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function ProjectsHeader() {
  const openCreateDialog = useProjectUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Projects
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real estate developments offered to your leads
        </p>
      </div>
      {can("project.create") ? (
        <Button size="sm" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New project
        </Button>
      ) : null}
    </div>
  );
}
