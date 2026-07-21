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
import { useAdmin, useAdmins } from "@/features/admins/hooks";
import { useResetAdminPassword } from "@/features/admins/mutations";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import {
  isValidPassword,
  PASSWORD_HINT,
} from "@/features/admins/utils/password";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

export function ResetAdminPasswordDialog() {
  const resetPasswordAdminId = useAdminUiStore((s) => s.resetPasswordAdminId);
  const closeResetPasswordDialog = useAdminUiStore(
    (s) => s.closeResetPasswordDialog,
  );
  const { data: listData } = useAdmins();
  const { data: adminDetail } = useAdmin(resetPasswordAdminId ?? undefined);
  const { can } = usePermissions();

  const admin =
    adminDetail ??
    listData?.items.find((item) => item.id === resetPasswordAdminId);
  const open = Boolean(resetPasswordAdminId && admin);

  const handleClose = () => {
    closeResetPasswordDialog();
  };

  if (!can(ADMIN_PERMISSIONS.ADMIN_MANAGE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {admin?.fullName}. This also revokes their
            active sessions.
          </DialogDescription>
        </DialogHeader>

        {admin ? (
          <ResetPasswordForm
            key={admin.id}
            admin={admin}
            onClose={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordForm({
  admin,
  onClose,
}: {
  admin: { id: string; fullName: string };
  onClose: () => void;
}) {
  const resetPassword = useResetAdminPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordValid = isValidPassword(password);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordValid || !passwordsMatch) return;

    await resetPassword.mutateAsync({
      adminId: admin.id,
      input: { newPassword: password },
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-admin-password">New password</Label>
        <Input
          id="reset-admin-password"
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
        <Label htmlFor="reset-admin-confirm-password">Confirm password</Label>
        <Input
          id="reset-admin-confirm-password"
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
