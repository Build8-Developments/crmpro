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
import { useResetUserPassword } from "@/features/users/mutations";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import {
  isValidPassword,
  PASSWORD_HINT,
} from "@/features/users/utils/password";
import { usePermissions } from "@/hooks/use-permissions";

export function ResetPasswordDialog() {
  const resetPasswordUserId = useUserUiStore((s) => s.resetPasswordUserId);
  const closeResetPasswordDialog = useUserUiStore(
    (s) => s.closeResetPasswordDialog,
  );
  const { data: listData } = useUsers();
  const { data: userDetail } = useUser(resetPasswordUserId ?? undefined);
  const { can } = usePermissions();

  const user =
    userDetail ?? listData?.items.find((item) => item.id === resetPasswordUserId);
  const open = Boolean(resetPasswordUserId && user);

  const handleClose = () => {
    closeResetPasswordDialog();
  };

  if (!can("user.manage")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {user?.fullName}. Their active sessions will
            remain until revoked separately.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <ResetPasswordForm key={user.id} user={user} onClose={handleClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordForm({
  user,
  onClose,
}: {
  user: { id: string; fullName: string };
  onClose: () => void;
}) {
  const resetPassword = useResetUserPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordValid = isValidPassword(password);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordValid || !passwordsMatch) return;

    await resetPassword.mutateAsync({
      userId: user.id,
      input: { newPassword: password },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-password">New password</Label>
        <Input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password">Confirm password</Label>
        <Input
          id="reset-confirm-password"
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
            resetPassword.isPending || !passwordValid || !passwordsMatch
          }
        >
          {resetPassword.isPending ? "Resetting..." : "Reset password"}
        </Button>
      </DialogFooter>
    </form>
  );
}
