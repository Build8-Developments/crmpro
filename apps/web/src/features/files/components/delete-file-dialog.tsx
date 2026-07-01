"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFiles } from "@/features/files/hooks";
import { useDeleteFile } from "@/features/files/mutations";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function DeleteFileDialog() {
  const deleteFileId = useFileUiStore((s) => s.deleteFileId);
  const closeDeleteDialog = useFileUiStore((s) => s.closeDeleteDialog);
  const { data } = useFiles();
  const deleteFile = useDeleteFile();
  const { can } = usePermissions();

  const file = data?.items.find((item) => item.id === deleteFileId);
  const open = Boolean(deleteFileId && file);

  const handleClose = () => {
    closeDeleteDialog();
  };

  const handleDelete = async () => {
    if (!deleteFileId) return;
    await deleteFile.mutateAsync(deleteFileId);
    handleClose();
  };

  if (!can("file.delete")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete file</DialogTitle>
          <DialogDescription>
            This permanently removes &quot;{file?.originalFilename}&quot; from
            your workspace. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleteFile.isPending}
            onClick={() => void handleDelete()}
          >
            {deleteFile.isPending ? "Deleting..." : "Delete file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
