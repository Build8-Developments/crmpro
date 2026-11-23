"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";
import { downloadImportTemplate } from "@/features/imports/utils/import-formatters";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ImportsToolbarProps {
  totalItems: number;
  isFetching?: boolean;
}

export function ImportsToolbar({
  totalItems,
  isFetching,
}: ImportsToolbarProps) {
  const openCreateDialog = useImportUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <span
        className={cn(
          "text-xs tabular-nums text-muted-foreground",
          isFetching && "opacity-70",
        )}
      >
        {formatNumber(totalItems)} import{totalItems === 1 ? "" : "s"}
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={downloadImportTemplate}
        >
          Template
        </Button>
        {can("import-job.create") ? (
          <Button size="sm" className="h-8" onClick={openCreateDialog}>
            <AppIcons.upload className="size-3.5" />
            Import leads
          </Button>
        ) : null}
      </div>
    </div>
  );
}
