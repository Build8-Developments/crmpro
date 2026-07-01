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

  const handleDownload = async () => {
    if (!can("file.read")) return;

    try {
      setDownloading(true);
      const { downloadUrl } = await getFileDownloadUrl(file.id);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Actions for ${file.originalFilename}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {can("file.read") ? (
          <DropdownMenuItem
            disabled={downloading}
            onClick={() => void handleDownload()}
          >
            <AppIcons.download className="size-3.5" />
            {downloading ? "Opening..." : "Download"}
          </DropdownMenuItem>
        ) : null}
        {can("file.delete") ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => openDeleteDialog(file.id)}
            >
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
