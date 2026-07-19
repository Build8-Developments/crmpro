"use client";

import { useRef, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUploadFiles } from "@/features/files/mutations";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import {
  formatFileSize,
  getFileKind,
  getFileKindTone,
  getFileTypeLabel,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from "@/features/files/utils/file-formatters";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

type QueuedFile = {
  id: string;
  file: File;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

function createQueuedFile(file: File): QueuedFile {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
    file,
    progress: 0,
    status: "ready",
  };
}

export function UploadFileDialog() {
  const uploadDialogOpen = useFileUiStore((s) => s.uploadDialogOpen);
  const closeUploadDialog = useFileUiStore((s) => s.closeUploadDialog);
  const uploadFiles = useUploadFiles();
  const { can } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploading = uploadFiles.isPending;
  const readyCount = queue.filter((item) => item.status === "ready").length;

  const handleClose = () => {
    if (uploading) return;
    closeUploadDialog();
    setQueue([]);
    setError(null);
    setDragging(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const addFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    setError(null);

    const next: QueuedFile[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(fileList)) {
      if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} exceeds 25 MB`);
        continue;
      }
      const alreadyQueued = queue.some(
        (item) =>
          item.file.name === file.name &&
          item.file.size === file.size &&
          item.file.lastModified === file.lastModified,
      );
      if (alreadyQueued) continue;
      next.push(createQueuedFile(file));
    }

    if (rejected.length > 0) {
      setError(rejected[0] ?? "Some files were skipped");
    }

    if (next.length > 0) {
      setQueue((current) => [...current, ...next]);
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  };

  const handleUpload = async () => {
    const filesToUpload = queue.filter((item) => item.status === "ready");
    if (filesToUpload.length === 0) return;

    setQueue((current) =>
      current.map((item) =>
        item.status === "ready"
          ? { ...item, status: "uploading", progress: 0, error: undefined }
          : item,
      ),
    );

    try {
      await uploadFiles.mutateAsync({
        files: filesToUpload.map((item) => item.file),
        onFileProgress: (index, progress) => {
          const targetId = filesToUpload[index]?.id;
          if (!targetId) return;
          setQueue((current) =>
            current.map((item) =>
              item.id === targetId
                ? {
                    ...item,
                    progress,
                    status: progress >= 100 ? "done" : "uploading",
                  }
                : item,
            ),
          );
        },
      });
      handleClose();
    } catch {
      setQueue((current) =>
        current.map((item) =>
          item.status === "uploading"
            ? {
                ...item,
                status: "error",
                error: "Upload failed",
              }
            : item,
        ),
      );
    }
  };

  if (!can("file.upload")) return null;

  return (
    <Dialog
      open={uploadDialogOpen}
      onOpenChange={(next) => !next && handleClose()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Drop files here or browse. Max 25 MB each. Lead attachments are
            added from the lead detail view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => !uploading && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!uploading) inputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!uploading) addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border/70 bg-muted/20 hover:bg-muted/30",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <AppIcons.upload className="size-5" />
            </span>
            <span className="mt-3 text-sm font-medium text-foreground">
              Drag & drop files here
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              or click to browse · multiple files supported
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {queue.length > 0 ? (
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {queue.map((item) => {
                const kind = getFileKind(item.file.type);
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                          getFileKindTone(kind),
                        )}
                      >
                        <AppIcons.files className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.file.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {getFileTypeLabel(item.file.type)} ·{" "}
                              {formatFileSize(item.file.size)}
                              {item.status === "error" && item.error
                                ? ` · ${item.error}`
                                : null}
                            </p>
                          </div>
                          {!uploading && item.status !== "done" ? (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => removeFromQueue(item.id)}
                              aria-label={`Remove ${item.file.name}`}
                            >
                              <AppIcons.close className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                        {item.status === "uploading" || item.status === "done" ? (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={readyCount === 0 || uploading}
            onClick={() => void handleUpload()}
          >
            {uploading ? (
              <>
                <AppIcons.loader className="size-4 animate-spin" />
                Uploading...
              </>
            ) : readyCount > 1 ? (
              `Upload ${readyCount} files`
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
