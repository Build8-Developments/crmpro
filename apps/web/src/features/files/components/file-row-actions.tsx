"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getFileDownloadUrl } from "@/features/files/api";
import type { FileAsset } from "@/features/files/types";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface FileRowActionsProps {
  file: FileAsset;
}

export function FileRowActions({ file }: FileRowActionsProps) {
  const openDeleteDialog = useFileUiStore((s) => s.openDeleteDialog);
  const { can } = usePermissions();
  const [downloading, setDownloading] = useState(false);

  const canRead = can("file.read");
  const canDelete = can("file.delete");

  const handleDownload = async () => {
    if (!canRead) return;

    try {
      setDownloading(true);
      const { downloadUrl } = await getFileDownloadUrl(file.id);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  if (!canRead && !canDelete) return null;

  return (
    <div className="flex items-center justify-end gap-0.5">
      {canRead ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={downloading}
          aria-label={`Download ${file.originalFilename}`}
          onClick={() => void handleDownload()}
        >
          <AppIcons.download className="size-3.5" />
        </Button>
      ) : null}

      {canDelete ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`More actions for ${file.originalFilename}`}
            >
              <AppIcons.moreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {canRead ? (
              <>
                <DropdownMenuItem
                  disabled={downloading}
                  onClick={() => void handleDownload()}
                >
                  Download
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(file.id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
