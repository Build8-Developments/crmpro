"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "@/components/crm/settings-section";
import { useChangePassword } from "@/features/account/mutations";

/** Mirrors the API rule in apps/api users.constants PASSWORD_PATTERN. */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function ChangePasswordCard() {
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const ruleOk = PASSWORD_RULE.test(newPassword);
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && ruleOk && matches && !changePassword.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
    } catch {
      return; // the mutation hook already shows the error toast
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <SettingsSection
      title="Password"
      description="Changing it signs you out on every other device"
    >
      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            aria-describedby="new-password-hint"
            required
          />
          <p
            id="new-password-hint"
            className={
              newPassword.length > 0 && !ruleOk
                ? "text-xs text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            At least 8 characters with an uppercase letter, a lowercase letter
            and a number.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={confirmPassword.length > 0 && !matches}
            required
          />
          {confirmPassword.length > 0 && !matches ? (
            <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
          ) : null}
        </div>
        <Button type="submit" disabled={!canSubmit}>
          {changePassword.isPending ? "Changing..." : "Change password"}
        </Button>
      </form>
    </SettingsSection>
  );
}
