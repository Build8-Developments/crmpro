"use client";

import { useEffect } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilePreview } from "@/features/files/hooks";
import type { FileAsset } from "@/features/files/types";
import {
  formatFileSize,
  getFileTypeLabel,
} from "@/features/files/utils/file-formatters";
import { FileVisual } from "./file-visual";
import { PdfViewer } from "./pdf-viewer";

/**
 * Full-screen viewer: images, PDFs (browser viewer), video, audio and plain
 * text render inline from a short-lived signed URL; anything else offers a
 * download. ←/→ step through the files in the current view.
 */
export function FilePreviewDialog({
  files,
  fileId,
  onChangeFile,
  onClose,
  onDownload,
}: {
  files: FileAsset[];
  fileId: string | null;
  onChangeFile: (fileId: string) => void;
  onClose: () => void;
  onDownload: (fileId: string) => void;
}) {
  const index = fileId ? files.findIndex((file) => file.id === fileId) : -1;
  const file = index >= 0 ? files[index] : null;
  const preview = useFilePreview(file?.id ?? null);
  const previous = index > 0 ? files[index - 1] : null;
  const next = index >= 0 && index < files.length - 1 ? files[index + 1] : null;

  useEffect(() => {
    if (!file) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && previous) onChangeFile(previous.id);
      if (event.key === "ArrowRight" && next) onChangeFile(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, previous, next, onChangeFile]);

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92dvh,900px)] w-[min(96vw,1200px)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none max-sm:border-0 max-sm:pb-0"
      >
        {file ? (
          <>
            <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border/60 px-4">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-sm font-semibold">
                  {file.originalFilename}
                </DialogTitle>
                <p className="truncate text-xs text-muted-foreground">
                  {getFileTypeLabel(file.mimeType)} · {formatFileSize(file.sizeBytes)}
                  {files.length > 1 ? ` · ${index + 1} of ${files.length}` : ""}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onDownload(file.id)}>
                <IconDownload className="size-4" />
                Download
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Close preview"
                onClick={onClose}
              >
                <IconX className="size-4" />
              </Button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/30">
              {preview.isLoading ? (
                <Skeleton className="h-3/4 w-3/4 rounded-lg" />
              ) : preview.data?.previewUrl && preview.data.kind ? (
                <PreviewBody
                  key={file.id}
                  kind={preview.data.kind}
                  url={preview.data.previewUrl}
                  file={file}
                />
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="size-28 overflow-hidden rounded-xl">
                    <FileVisual
                      mimeType={file.mimeType}
                      previewUrl={file.previewUrl}
                      name={file.originalFilename}
                    />
                  </div>
                  <p className="text-sm font-medium">
                    This file type can&apos;t be previewed
                  </p>
                  <Button size="sm" onClick={() => onDownload(file.id)}>
                    <IconDownload className="size-4" /> Download to open it
                  </Button>
                </div>
              )}

              {previous ? (
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label="Previous file"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow"
                  onClick={() => onChangeFile(previous.id)}
                >
                  <IconChevronLeft className="size-5" />
                </Button>
              ) : null}
              {next ? (
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label="Next file"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow"
                  onClick={() => onChangeFile(next.id)}
                >
                  <IconChevronRight className="size-5" />
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({
  kind,
  url,
  file,
}: {
  kind: "image" | "pdf" | "video" | "audio" | "text";
  url: string;
  file: FileAsset;
}) {
  switch (kind) {
    case "image":
      return (
        // Signed storage URL; next/image would need the bucket host configured.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={file.originalFilename}
          className="max-h-full max-w-full object-contain"
        />
      );
    case "pdf":
      return <PdfViewer url={url} title={file.originalFilename} />;
    case "text":
      return (
        <iframe
          src={url}
          title={file.originalFilename}
          className="size-full border-0 bg-white"
        />
      );
    case "video":
      return (
        <video src={url} controls className="max-h-full max-w-full" />
      );
    case "audio":
      return <audio src={url} controls className="w-full max-w-md" />;
  }
}
