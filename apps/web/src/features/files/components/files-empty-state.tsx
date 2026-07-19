"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface FilesEmptyStateProps {
  hasFilters: boolean;
}

export function FilesEmptyState({ hasFilters }: FilesEmptyStateProps) {
  const openUploadDialog = useFileUiStore((s) => s.openUploadDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <AppIcons.files className="size-6" />
      </span>
      <h3 className="mt-4 text-sm font-medium text-foreground">
        {hasFilters ? "No files match your filters" : "No files yet"}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {hasFilters
          ? "Try another search or category."
          : "Uploads, imports, and lead attachments will show up here."}
      </p>
      {!hasFilters && can("file.upload") ? (
        <Button size="sm" className="mt-4" onClick={openUploadDialog}>
          <AppIcons.upload className="size-3.5" />
          Upload file
        </Button>
      ) : null}
    </div>
  );
}
