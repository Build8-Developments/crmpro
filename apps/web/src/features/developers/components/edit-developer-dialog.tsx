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
import { useUpdateDeveloper } from "@/features/developers/mutations";
import { DeveloperDuplicateHint } from "@/features/developers/components/developer-duplicate-hint";
import { useDeveloperNameDuplicate } from "@/features/developers/hooks/use-developer-name-duplicate";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function EditDeveloperDialog() {
  const editDeveloperId = useDeveloperUiStore((s) => s.editDeveloperId);
  const closeEditDialog = useDeveloperUiStore((s) => s.closeEditDialog);
  const { data: listData } = useDevelopers();
  const { data: developerDetail } = useDeveloper(editDeveloperId ?? undefined);
  const { can } = usePermissions();

  const developer =
    developerDetail ??
    listData?.items.find((item) => item.id === editDeveloperId);
  const open = Boolean(editDeveloperId && developer);

  const handleClose = () => {
    closeEditDialog();
  };

  if (!can("developer.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit developer</DialogTitle>
          <DialogDescription>
            Update the display name for this developer.
          </DialogDescription>
        </DialogHeader>

        {developer ? (
          <EditDeveloperForm
            key={developer.id}
            developer={developer}
            onClose={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditDeveloperForm({
  developer,
  onClose,
}: {
  developer: { id: string; name: string };
  onClose: () => void;
}) {
  const updateDeveloper = useUpdateDeveloper();
  const [name, setName] = useState(developer.name);
  const duplicate = useDeveloperNameDuplicate(name, developer.id);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) return;

    await updateDeveloper.mutateAsync({
      developerId: developer.id,
      input: { name: trimmed },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-developer-name">Name</Label>
        <Input
          id="edit-developer-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
        <DeveloperDuplicateHint duplicate={duplicate} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateDeveloper.isPending ||
            name.trim().length < 2 ||
            name.trim() === developer.name ||
            Boolean(duplicate)
          }
        >
          {updateDeveloper.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
