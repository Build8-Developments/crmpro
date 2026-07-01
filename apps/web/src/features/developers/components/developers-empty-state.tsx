"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface DevelopersEmptyStateProps {
  hasSearch: boolean;
}

export function DevelopersEmptyState({ hasSearch }: DevelopersEmptyStateProps) {
  const openCreateDialog = useDeveloperUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <AppIcons.search className="mb-3 size-8 text-muted-foreground/60" />
        <h2 className="text-sm font-medium text-foreground">No matches</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AppIcons.developers className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        No developers yet
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Add real estate developers to link them with projects and track interest.
      </p>
      {can("developer.create") ? (
        <Button className="mt-6" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New developer
        </Button>
      ) : null}
    </div>
  );
}
