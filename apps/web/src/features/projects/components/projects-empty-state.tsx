"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface ProjectsEmptyStateProps {
  hasFilters: boolean;
}

export function ProjectsEmptyState({ hasFilters }: ProjectsEmptyStateProps) {
  const openCreateDialog = useProjectUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <AppIcons.search className="mb-3 size-8 text-muted-foreground/60" />
        <h2 className="text-sm font-medium text-foreground">No matches</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AppIcons.projects className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No projects yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add real estate projects and link them to developers for lead interest
        tracking.
      </p>
      {can("project.create") ? (
        <Button className="mt-6" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New project
        </Button>
      ) : null}
    </div>
  );
}
