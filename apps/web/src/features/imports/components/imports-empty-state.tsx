"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";
import { downloadImportTemplate } from "@/features/imports/utils/import-formatters";
import { usePermissions } from "@/hooks/use-permissions";

export function ImportsEmptyState() {
  const openCreateDialog = useImportUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <AppIcons.imports className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold">No imports yet</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Upload an Excel or CSV file to create many leads at once. Arabic or
        English headers are matched automatically.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadImportTemplate}
        >
          Download template
        </Button>
        {can("import-job.create") ? (
          <Button type="button" size="sm" onClick={openCreateDialog}>
            <AppIcons.upload className="size-3.5" />
            Import leads
          </Button>
        ) : null}
      </div>
    </div>
  );
}
