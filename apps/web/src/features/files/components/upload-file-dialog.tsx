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
import { useUploadFile } from "@/features/files/mutations";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import {
  formatFileSize,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from "@/features/files/utils/file-formatters";
import { usePermissions } from "@/hooks/use-permissions";

export function UploadFileDialog() {
  const uploadDialogOpen = useFileUiStore((s) => s.uploadDialogOpen);
  const closeUploadDialog = useFileUiStore((s) => s.closeUploadDialog);
  const uploadFile = useUploadFile();
  const { can } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    closeUploadDialog();
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleFileChange = (file: File | null) => {
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setError("File exceeds the 25 MB limit.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    await uploadFile.mutateAsync(selectedFile);
    handleClose();
  };

  if (!can("file.upload")) return null;

  return (
    <Dialog open={uploadDialogOpen} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            Upload a general workspace file (max 25 MB). Lead attachments are
            added from the lead detail view.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/30"
            onClick={() => inputRef.current?.click()}
          >
            <AppIcons.upload className="size-8 text-muted-foreground/50" />
            <span className="mt-2 text-sm font-medium text-foreground">
              {selectedFile ? selectedFile.name : "Choose a file"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {selectedFile
                ? formatFileSize(selectedFile.size)
                : "Click to browse"}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) =>
              handleFileChange(event.target.files?.[0] ?? null)
            }
          />
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedFile || uploadFile.isPending}
            onClick={() => void handleUpload()}
          >
            {uploadFile.isPending ? (
              <>
                <AppIcons.loader className="size-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
