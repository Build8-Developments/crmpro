"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useExportUiStore } from "@/features/exports/stores/export-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function ExportsEmptyState() {
  const openCreateDialog = useExportUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <AppIcons.exports className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">No exports yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Export your leads to a CSV file. Processing runs in the background and
        you can download when it finishes.
      </p>
      {can("export-job.create") ? (
        <Button
          type="button"
          size="sm"
          className="mt-4"
          onClick={openCreateDialog}
        >
          <AppIcons.exports className="size-3.5" />
          Export leads
        </Button>
      ) : null}
    </div>
  );
}
