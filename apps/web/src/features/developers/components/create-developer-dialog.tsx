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
import { useCreateDeveloper } from "@/features/developers/mutations";
import { DeveloperDuplicateHint } from "@/features/developers/components/developer-duplicate-hint";
import { useDeveloperNameDuplicate } from "@/features/developers/hooks/use-developer-name-duplicate";
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function CreateDeveloperDialog() {
  const open = useDeveloperUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useDeveloperUiStore((s) => s.closeCreateDialog);
  const createDeveloper = useCreateDeveloper();
  const { can } = usePermissions();
  const [name, setName] = useState("");
  const duplicate = useDeveloperNameDuplicate(name);

  const handleClose = () => {
    closeCreateDialog();
    setName("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    await createDeveloper.mutateAsync({ name: trimmed });
    handleClose();
  };

  if (!can("developer.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New developer</DialogTitle>
          <DialogDescription>
            Add a real estate developer to your catalog.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="developer-name">Name</Label>
            <Input
              id="developer-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Emaar Properties"
              required
              minLength={2}
              maxLength={120}
              autoFocus
            />
            <DeveloperDuplicateHint duplicate={duplicate} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createDeveloper.isPending ||
                name.trim().length < 2 ||
                Boolean(duplicate)
              }
            >
              {createDeveloper.isPending ? "Creating..." : "Create developer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
