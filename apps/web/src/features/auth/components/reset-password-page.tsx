"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/features/auth/recovery-api";
import { isValidPassword } from "@/features/users/utils/password";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";
import { NewPasswordFields } from "./new-password-fields";

export function ResetPasswordPage() {
  const t = useTranslations("auth.recovery");
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard title={t("reset.title")} description={t("reset.missingToken")}>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">{t("forgot.title")}</Link>
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title={t("reset.doneTitle")} description={t("reset.doneDescription")} showBackLink={false}>
        <Button asChild className="w-full">
          <Link href="/login">{t("backToSignIn")}</Link>
        </Button>
      </AuthCard>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title={t("reset.title")} description={t("reset.description")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          disabled={submitting}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={submitting || !isValidPassword(password) || password !== confirm}
        >
          {submitting ? t("reset.saving") : t("reset.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
