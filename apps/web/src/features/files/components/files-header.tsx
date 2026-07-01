"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function FilesHeader() {
  const openUploadDialog = useFileUiStore((s) => s.openUploadDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Files
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Uploaded documents and attachments across your workspace
        </p>
      </div>
      {can("file.upload") ? (
        <Button size="sm" onClick={openUploadDialog}>
          <AppIcons.upload className="size-4" />
          Upload file
        </Button>
      ) : null}
    </div>
  );
}
