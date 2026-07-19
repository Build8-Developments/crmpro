"use client";

import { useState } from "react";
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
import { useBulkDeleteFiles } from "@/features/files/mutations";
import { formatNumber } from "@/lib/format";

interface FilesBulkToolbarProps {
  selectedCount: number;
  selectedFileIds: string[];
  onClearSelection: () => void;
}

export function FilesBulkToolbar({
  selectedCount,
  selectedFileIds,
  onClearSelection,
}: FilesBulkToolbarProps) {
  const bulkDelete = useBulkDeleteFiles();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleDelete = async () => {
    await bulkDelete.mutateAsync(selectedFileIds);
    setConfirmOpen(false);
    onClearSelection();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/30 px-4 py-2">
        <p className="text-xs font-medium text-foreground">
          {formatNumber(selectedCount)} selected
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={onClearSelection}
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="ml-auto h-7 px-2 text-xs"
          disabled={bulkDelete.isPending}
          onClick={() => setConfirmOpen(true)}
        >
          <AppIcons.close className="size-3.5" />
          Delete selected
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (bulkDelete.isPending) return;
          setConfirmOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected files</DialogTitle>
            <DialogDescription>
              This permanently removes {formatNumber(selectedCount)} file
              {selectedCount === 1 ? "" : "s"} from your workspace. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={bulkDelete.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={bulkDelete.isPending}
              onClick={() => void handleDelete()}
            >
              {bulkDelete.isPending ? (
                <>
                  <AppIcons.loader className="size-3.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete files"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
