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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <AppIcons.files className="size-10 text-muted-foreground/40" />
      <h3 className="mt-4 text-sm font-medium text-foreground">
        {hasFilters ? "No files match your filters" : "No files yet"}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {hasFilters
          ? "Try adjusting your search or category filter."
          : "Uploaded attachments, imports, and exports will appear here."}
      </p>
      {!hasFilters && can("file.upload") ? (
        <Button size="sm" className="mt-4" onClick={openUploadDialog}>
          <AppIcons.upload className="size-4" />
          Upload file
        </Button>
      ) : null}
    </div>
  );
}
