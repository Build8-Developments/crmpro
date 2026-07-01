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
import { useUser, useUsers } from "@/features/users/hooks";
import { useUpdateUser } from "@/features/users/mutations";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function EditUserDialog() {
  const editUserId = useUserUiStore((s) => s.editUserId);
  const closeEditDialog = useUserUiStore((s) => s.closeEditDialog);
  const { data: listData } = useUsers();
  const { data: userDetail } = useUser(editUserId ?? undefined);
  const { can } = usePermissions();

  const user =
    userDetail ?? listData?.items.find((item) => item.id === editUserId);
  const open = Boolean(editUserId && user);

  const handleClose = () => {
    closeEditDialog();
  };

  if (!can("user.update")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>Update the display name for this member.</DialogDescription>
        </DialogHeader>

        {user ? (
          <EditUserForm key={user.id} user={user} onClose={handleClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  onClose,
}: {
  user: { id: string; fullName: string };
  onClose: () => void;
}) {
  const updateUser = useUpdateUser();
  const [fullName, setFullName] = useState(user.fullName);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = fullName.trim();
    if (!trimmed) return;

    await updateUser.mutateAsync({
      userId: user.id,
      input: { fullName: trimmed },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit-user-name">Full name</Label>
        <Input
          id="edit-user-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            updateUser.isPending ||
            fullName.trim().length < 2 ||
            fullName.trim() === user.fullName
          }
        >
          {updateUser.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
