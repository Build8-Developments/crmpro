"use client";

import { useMemo, useState } from "react";
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
import { useRoles } from "@/features/roles/hooks";
import { useCreateRole } from "@/features/roles/mutations";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import { normalizeRoleNameForComparison } from "@/features/roles/utils/role-name";
import { usePermissions } from "@/hooks/use-permissions";

export function CreateRoleDialog() {
  const open = useRoleUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useRoleUiStore((s) => s.closeCreateDialog);
  const setSelectedRoleId = useRoleUiStore((s) => s.setSelectedRoleId);
  const createRole = useCreateRole();
  const { data: roles } = useRoles();
  const { can } = usePermissions();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const duplicate = useMemo(() => {
    const normalized = normalizeRoleNameForComparison(name);
    if (normalized.length < 2) return null;
    return (
      roles?.find(
        (role) => normalizeRoleNameForComparison(role.name) === normalized,
      ) ?? null
    );
  }, [name, roles]);

  const handleClose = () => {
    closeCreateDialog();
    setName("");
    setDescription("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || duplicate) return;

    const created = await createRole.mutateAsync({
      name: trimmed,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
    setSelectedRoleId(created.id);
    handleClose();
  };

  if (!can("role.manage")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
          <DialogDescription>
            Create a custom role, then assign permissions in the detail panel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Senior Agent"
              required
              minLength={2}
              maxLength={80}
              autoFocus
            />
            {duplicate ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                A role named &quot;{duplicate.name}&quot; already exists.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description (optional)</Label>
            <Input
              id="role-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Can manage leads and view reports"
              maxLength={255}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createRole.isPending ||
                name.trim().length < 2 ||
                Boolean(duplicate)
              }
            >
              {createRole.isPending ? "Creating..." : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
