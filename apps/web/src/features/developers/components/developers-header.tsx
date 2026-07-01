"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function DevelopersHeader() {
  const openCreateDialog = useDeveloperUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Developers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real estate developers catalog for your projects and leads
        </p>
      </div>
      {can("developer.create") ? (
        <Button size="sm" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New developer
        </Button>
      ) : null}
    </div>
  );
}
