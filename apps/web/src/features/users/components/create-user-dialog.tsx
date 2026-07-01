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
import { useRoles } from "@/features/users/hooks";
import { useCreateUser } from "@/features/users/mutations";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import {
  isValidPassword,
  PASSWORD_HINT,
} from "@/features/users/utils/password";
import { usePermissions } from "@/hooks/use-permissions";

export function CreateUserDialog() {
  const open = useUserUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useUserUiStore((s) => s.closeCreateDialog);
  const { can } = usePermissions();

  const handleClose = () => {
    closeCreateDialog();
  };

  if (!can("user.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New user</DialogTitle>
          <DialogDescription>
            Create a team member with login credentials and a role.
          </DialogDescription>
        </DialogHeader>

        {open ? <CreateUserForm key="create-user" onClose={handleClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const createUser = useCreateUser();
  const { data: roles, isLoading: rolesLoading } = useRoles();
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

    await createUser.mutateAsync({
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
        <Label htmlFor="user-full-name">Full name</Label>
        <Input
          id="user-full-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          minLength={2}
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-email">Email</Label>
        <Input
          id="user-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-role">Role</Label>
        <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
          <SelectTrigger id="user-role">
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
        <Label htmlFor="user-password">Password</Label>
        <Input
          id="user-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-confirm-password">Confirm password</Label>
        <Input
          id="user-confirm-password"
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
            createUser.isPending ||
            !roleId ||
            fullName.trim().length < 2 ||
            !email.trim() ||
            !passwordValid ||
            !passwordsMatch
          }
        >
          {createUser.isPending ? "Creating..." : "Create user"}
        </Button>
      </DialogFooter>
    </form>
  );
}
