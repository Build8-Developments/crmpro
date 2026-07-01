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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles, useUser, useUsers } from "@/features/users/hooks";
import { useUpdateUserRole } from "@/features/users/mutations";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";

export function ChangeUserRoleDialog() {
  const changeRoleUserId = useUserUiStore((s) => s.changeRoleUserId);
  const closeChangeRoleDialog = useUserUiStore((s) => s.closeChangeRoleDialog);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data: listData } = useUsers();
  const { data: userDetail } = useUser(changeRoleUserId ?? undefined);
  const { can } = usePermissions();

  const user =
    userDetail ?? listData?.items.find((item) => item.id === changeRoleUserId);
  const open = Boolean(
    changeRoleUserId && user && changeRoleUserId !== currentUserId,
  );

  const handleClose = () => {
    closeChangeRoleDialog();
  };

  if (!can("user.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Assign a new role for {user?.fullName}.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <ChangeRoleForm key={user.id} user={user} onClose={handleClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleForm({
  user,
  onClose,
}: {
  user: { id: string; fullName: string; role: { id: string; name: string } };
  onClose: () => void;
}) {
  const updateRole = useUpdateUserRole();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const [roleId, setRoleId] = useState(user.role.id);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (roleId === user.role.id) return;

    await updateRole.mutateAsync({
      userId: user.id,
      input: { roleId },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="change-user-role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
          <SelectTrigger id="change-user-role">
            <SelectValue />
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
          disabled={updateRole.isPending || roleId === user.role.id}
        >
          {updateRole.isPending ? "Saving..." : "Save role"}
        </Button>
      </DialogFooter>
    </form>
  );
}
