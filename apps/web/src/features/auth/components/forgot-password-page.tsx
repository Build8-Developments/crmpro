"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/recovery-api";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";

export function ForgotPasswordPage() {
  const t = useTranslations("auth.recovery");
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState(searchParams.get("workspace") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset({
        tenantSlug: workspace.trim().toLowerCase(),
        email: email.trim(),
      });
      setSent(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title={t("forgot.sentTitle")}
        description={t("forgot.sentDescription", { email, workspace })}
      >
        <span />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("forgot.title")} description={t("forgot.description")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace">{t("workspaceLabel")}</Label>
          <Input
            id="workspace"
            value={workspace}
            onChange={(event) => setWorkspace(event.target.value)}
            placeholder="prime-estates"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting || !workspace || !email}>
          {submitting ? t("forgot.sending") : t("forgot.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
