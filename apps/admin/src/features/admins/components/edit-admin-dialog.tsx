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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdmin, useAdminRoles, useAdmins } from "@/features/admins/hooks";
import { useUpdateAdmin } from "@/features/admins/mutations";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

export function EditAdminDialog() {
  const editAdminId = useAdminUiStore((s) => s.editAdminId);
  const closeEditDialog = useAdminUiStore((s) => s.closeEditDialog);
  const { data: listData } = useAdmins();
  const { data: adminDetail } = useAdmin(editAdminId ?? undefined);
  const { can } = usePermissions();

  const listItem = listData?.items.find((item) => item.id === editAdminId);
  const admin = adminDetail
    ? {
        id: adminDetail.id,
        fullName: adminDetail.fullName,
        email: adminDetail.email,
        roleId: adminDetail.role.id,
      }
    : listItem
      ? {
          id: listItem.id,
          fullName: listItem.fullName,
          email: listItem.email,
          roleId: listItem.roleId,
        }
      : null;

  const open = Boolean(editAdminId && admin);

  const handleClose = () => {
    closeEditDialog();
  };

  if (!can(ADMIN_PERMISSIONS.ADMIN_MANAGE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit admin</DialogTitle>
          <DialogDescription>
            Update name, email, or role for this staff account.
          </DialogDescription>
        </DialogHeader>

        {admin ? (
          <EditAdminForm key={admin.id} admin={admin} onClose={handleClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditAdminForm({
  admin,
  onClose,
}: {
  admin: { id: string; fullName: string; email: string; roleId: string };
  onClose: () => void;
}) {
  const updateAdmin = useUpdateAdmin();
  const { data: roles, isLoading: rolesLoading } = useAdminRoles();
  const [fullName, setFullName] = useState(admin.fullName);
  const [email, setEmail] = useState(admin.email);
  const [roleId, setRoleId] = useState(admin.roleId);

  const hasChanges =
    fullName.trim() !== admin.fullName ||
    email.trim().toLowerCase() !== admin.email.toLowerCase() ||
    roleId !== admin.roleId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || !roleId) return;

    await updateAdmin.mutateAsync({
      adminId: admin.id,
      input: {
        fullName: trimmedName,
        email: trimmedEmail,
        roleId,
      },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-admin-name">Full name</Label>
        <Input
          id="edit-admin-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-admin-email">Email</Label>
        <Input
          id="edit-admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-admin-role">Role</Label>
        <Select
          value={roleId}
          onValueChange={setRoleId}
          disabled={rolesLoading}
        >
          <SelectTrigger id="edit-admin-role">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {(roles ?? []).map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateAdmin.isPending ||
            fullName.trim().length < 2 ||
            !email.trim() ||
            !hasChanges
          }
        >
          {updateAdmin.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
