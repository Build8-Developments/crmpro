"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDeveloper, useDevelopers } from "@/features/developers/hooks";
import { useDeleteDeveloper } from "@/features/developers/mutations";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import { formatNumber } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";

export function DeleteDeveloperDialog() {
  const deleteDeveloperId = useDeveloperUiStore((s) => s.deleteDeveloperId);
  const closeDeleteDialog = useDeveloperUiStore((s) => s.closeDeleteDialog);
  const { data: listData } = useDevelopers();
  const { data: developerDetail } = useDeveloper(
    deleteDeveloperId ?? undefined,
  );
  const deleteDeveloper = useDeleteDeveloper();
  const { can } = usePermissions();
  const [confirmName, setConfirmName] = useState("");

  const developer =
    developerDetail ??
    listData?.items.find((item) => item.id === deleteDeveloperId);
  const open = Boolean(deleteDeveloperId && developer);
  const hasProjects = (developer?.projectCount ?? 0) > 0;

  const handleClose = () => {
    closeDeleteDialog();
    setConfirmName("");
  };

  const handleDelete = async () => {
    if (!deleteDeveloperId || !developer || hasProjects) return;

    await deleteDeveloper.mutateAsync(deleteDeveloperId);
    handleClose();
  };

  if (!can("developer.delete")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete developer</DialogTitle>
          <DialogDescription>
            {hasProjects ? (
              <>
                &quot;{developer?.name}&quot; has{" "}
                {formatNumber(developer?.projectCount ?? 0)} active project
                {(developer?.projectCount ?? 0) === 1 ? "" : "s"}. Remove or
                reassign those projects before deleting this developer.
              </>
            ) : (
              <>
                This removes &quot;{developer?.name}&quot; from your catalog.
                Existing leads are not affected.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!hasProjects ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-developer-name">
              Type <span className="font-medium">{developer?.name}</span> to
              confirm
            </Label>
            <Input
              id="confirm-developer-name"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={developer?.name}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {hasProjects ? "Close" : "Cancel"}
          </Button>
          {!hasProjects ? (
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleteDeveloper.isPending ||
                confirmName.trim() !== developer?.name
              }
              onClick={() => void handleDelete()}
            >
              {deleteDeveloper.isPending ? "Deleting..." : "Delete developer"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
