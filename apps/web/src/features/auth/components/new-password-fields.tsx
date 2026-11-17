"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  disabled,
}: {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("auth.recovery");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">{t("newPassword")}</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          disabled={disabled}
          required
        />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => onConfirmChange(event.target.value)}
          disabled={disabled}
          required
        />
        {confirm && confirm !== password ? (
          <p className="text-xs text-destructive">{t("passwordsDontMatch")}</p>
        ) : null}
      </div>
    </div>
  );
}
