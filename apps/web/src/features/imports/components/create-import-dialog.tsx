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
import { useCreateLeadImport } from "@/features/imports/mutations";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";
import {
  downloadImportTemplate,
  IMPORT_OPTIONAL_COLUMNS,
  IMPORT_REQUIRED_COLUMNS,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "@/features/imports/utils/import-formatters";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

function isCsvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/csv"
  );
}

export function CreateImportDialog() {
  const open = useImportUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useImportUiStore((s) => s.closeCreateDialog);
  const openJobDetail = useImportUiStore((s) => s.openJobDetail);
  const createImport = useCreateLeadImport();
  const { can } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploading = createImport.isPending;

  const reset = () => {
    setFile(null);
    setError(null);
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    if (uploading) return;
    closeCreateDialog();
    reset();
  };

  const selectFile = (next: File | null) => {
    setError(null);
    if (!next) {
      setFile(null);
      return;
    }
    if (!isCsvFile(next)) {
      setError("Please choose a .csv file");
      setFile(null);
      return;
    }
    if (next.size > MAX_IMPORT_FILE_SIZE_BYTES) {
      setError("File exceeds 25 MB");
      setFile(null);
      return;
    }
    setFile(next);
  };

  const handleSubmit = async () => {
    if (!file) return;
    try {
      const job = await createImport.mutateAsync(file);
      closeCreateDialog();
      reset();
      openJobDetail(job.id);
    } catch {
      setError("Import failed to start. Check the file and try again.");
    }
  };

  if (!can("import-job.create")) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && handleClose()}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV to create leads. Processing runs in the background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Required:</span>{" "}
              {IMPORT_REQUIRED_COLUMNS.join(", ")}
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Optional:</span>{" "}
              {IMPORT_OPTIONAL_COLUMNS.join(", ")}
            </p>
            <button
              type="button"
              className="mt-2 font-medium text-primary hover:underline"
              onClick={downloadImportTemplate}
            >
              Download CSV template
            </button>
          </div>

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
              if (!uploading) {
                selectFile(event.dataTransfer.files?.[0] ?? null);
              }
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
              {file ? file.name : "Drop CSV here or browse"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {file
                ? formatFileSize(file.size)
                : "Max 25 MB · .csv only"}
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              selectFile(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />

          {file && !uploading ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => selectFile(null)}
            >
              Remove file
            </button>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
            disabled={!file || uploading}
            onClick={() => void handleSubmit()}
          >
            {uploading ? (
              <>
                <AppIcons.loader className="size-4 animate-spin" />
                Starting...
              </>
            ) : (
              "Start import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
