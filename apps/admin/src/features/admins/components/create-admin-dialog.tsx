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
import { useAdminRoles } from "@/features/admins/hooks";
import { useCreateAdmin } from "@/features/admins/mutations";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import {
  isValidPassword,
  PASSWORD_HINT,
} from "@/features/admins/utils/password";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

export function CreateAdminDialog() {
  const open = useAdminUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useAdminUiStore((s) => s.closeCreateDialog);
  const { can } = usePermissions();

  const handleClose = () => {
    closeCreateDialog();
  };

  if (!can(ADMIN_PERMISSIONS.ADMIN_MANAGE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New admin</DialogTitle>
          <DialogDescription>
            Create a platform staff account with login credentials and a role.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CreateAdminForm key="create-admin" onClose={handleClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateAdminForm({ onClose }: { onClose: () => void }) {
  const createAdmin = useCreateAdmin();
  const { data: roles, isLoading: rolesLoading } = useAdminRoles();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleId, setRoleId] = useState<string>();

  const passwordValid = isValidPassword(password);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roleId || !passwordValid || !passwordsMatch) return;

    await createAdmin.mutateAsync({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      roleId,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-full-name">Full name</Label>
        <Input
          id="admin-full-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
          <SelectTrigger id="admin-role">
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

      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-confirm-password">Confirm password</Label>
        <Input
          id="admin-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        {confirmPassword && !passwordsMatch ? (
          <p className="text-xs text-destructive">Passwords do not match.</p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            createAdmin.isPending ||
            !roleId ||
            fullName.trim().length < 2 ||
            !email.trim() ||
            !passwordValid ||
            !passwordsMatch
          }
        >
          {createAdmin.isPending ? "Creating..." : "Create admin"}
        </Button>
      </DialogFooter>
    </form>
  );
}
