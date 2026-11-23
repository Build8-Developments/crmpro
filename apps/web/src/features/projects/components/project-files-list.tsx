"use client";

import { useMemo, useState } from "react";
import { IconFileText, IconPhoto } from "@tabler/icons-react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileDownloadUrl } from "@/features/files/api";
import { FilePreviewDialog } from "@/features/files/components/gallery/file-preview-dialog";
import type { FileAsset, FileAssetCategory } from "@/features/files/types";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import { useProjectFiles } from "@/features/projects/hooks";
import type { ProjectFile } from "@/features/projects/types";
import { formatUpdateAge } from "@/features/project-updates/utils/project-update-format";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";
import { toast } from "@/lib/toast";

/** The gallery previewer works on FileAsset; project files carry what it needs. */
function toPreviewFile(file: ProjectFile): FileAsset {
  return {
    id: file.id,
    category: file.category as FileAssetCategory,
    originalFilename: file.originalFilename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    leadId: null,
    projectId: file.projectId,
    folderId: null,
    createdAt: file.createdAt,
    uploadedBy: { id: file.uploadedBy.id, fullName: file.uploadedBy.fullName, email: "" },
    lead: null,
    project: null,
  };
}

/** Brochures and price sheets of a project: preview and download. */
export function ProjectFilesList({ projectId }: { projectId: string }) {
  const { can } = usePermissions();
  const now = useNow(60_000);
  const files = useProjectFiles(projectId);
  const [openId, setOpenId] = useState<string | null>(null);
  const items = useMemo(() => files.data ?? [], [files.data]);
  const previewFiles = useMemo(() => items.map(toPreviewFile), [items]);

  if (!can("file.read")) {
    return (
      <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
        You don&apos;t have access to files.
      </p>
    );
  }

  const download = async (fileId: string) => {
    try {
      const { downloadUrl } = await getFileDownloadUrl(fileId);
      window.open(downloadUrl, "_blank", "noopener");
    } catch {
      toast.error("Couldn't download the file");
    }
  };

  if (files.isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (files.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 px-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load files.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          disabled={files.isFetching}
          onClick={() => void files.refetch()}
        >
          {files.isFetching ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-8 text-center">
        <AppIcons.files className="size-5 text-muted-foreground" />
        <p className="text-sm font-medium">No files yet</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Brochures, price sheets and floor plans for this project show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-1.5">
        {items.map((file) => {
          const Icon = file.mimeType.startsWith("image/") ? IconPhoto : IconFileText;
          return (
            <li key={file.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpenId(file.id)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors duration-fast ease-enter hover:bg-muted/60"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {file.originalFilename}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatFileSize(file.sizeBytes)} · {file.uploadedBy.fullName} ·{" "}
                    {formatUpdateAge(file.createdAt, now)}
                  </span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                aria-label={`Download ${file.originalFilename}`}
                onClick={() => void download(file.id)}
              >
                <AppIcons.download className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>

      <FilePreviewDialog
        files={previewFiles}
        fileId={openId}
        onChangeFile={setOpenId}
        onClose={() => setOpenId(null)}
        onDownload={(id) => void download(id)}
      />
    </>
  );
}
