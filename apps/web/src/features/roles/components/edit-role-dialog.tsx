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
import { useRole, useRoles } from "@/features/roles/hooks";
import { useUpdateRole } from "@/features/roles/mutations";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import { normalizeRoleNameForComparison } from "@/features/roles/utils/role-name";
import { usePermissions } from "@/hooks/use-permissions";

export function EditRoleDialog() {
  const editRoleId = useRoleUiStore((s) => s.editRoleId);
  const closeEditDialog = useRoleUiStore((s) => s.closeEditDialog);
  const { data: roles } = useRoles();
  const { data: roleDetail } = useRole(editRoleId ?? undefined);
  const { can } = usePermissions();

  const role =
    roleDetail ?? roles?.find((item) => item.id === editRoleId);
  const open = Boolean(editRoleId && role && !role.isSystem);

  const handleClose = () => {
    closeEditDialog();
  };

  if (!can("role.manage")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename role</DialogTitle>
          <DialogDescription>
            Update the display name for this custom role.
          </DialogDescription>
        </DialogHeader>

        {role ? (
          <EditRoleForm key={role.id} role={role} onClose={handleClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditRoleForm({
  role,
  onClose,
}: {
  role: { id: string; name: string };
  onClose: () => void;
}) {
  const updateRole = useUpdateRole();
  const { data: roles } = useRoles();
  const [name, setName] = useState(role.name);

  const duplicate = useMemo(() => {
    const normalized = normalizeRoleNameForComparison(name);
    if (normalized.length < 2) return null;
    return (
      roles?.find(
        (item) =>
          item.id !== role.id &&
          normalizeRoleNameForComparison(item.name) === normalized,
      ) ?? null
    );
  }, [name, role.id, roles]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || duplicate) return;

    await updateRole.mutateAsync({
      roleId: role.id,
      input: { name: trimmed },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-role-name">Name</Label>
        <Input
          id="edit-role-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateRole.isPending ||
            name.trim().length < 2 ||
            name.trim() === role.name ||
            Boolean(duplicate)
          }
        >
          {updateRole.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
