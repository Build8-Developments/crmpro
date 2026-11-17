"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { acceptInvitation, getInvitation } from "@/features/auth/recovery-api";
import { isValidPassword } from "@/features/users/utils/password";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";
import { NewPasswordFields } from "./new-password-fields";

export function AcceptInvitePage() {
  const t = useTranslations("auth.recovery");
  const token = useSearchParams().get("token") ?? "";
  const invitation = useQuery({
    queryKey: ["auth", "invitation", token],
    queryFn: () => getInvitation(token),
    enabled: token.length > 0,
    retry: false,
  });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || invitation.isError) {
    return (
      <AuthCard title={t("invite.title", { workspace: "CRMPro" })} description={t("invite.invalid")}>
        <span />
      </AuthCard>
    );
  }

  if (invitation.isLoading || !invitation.data) {
    return (
      <AuthCard title={t("invite.loading")} showBackLink={false}>
        <Skeleton className="h-24 w-full" />
      </AuthCard>
    );
  }

  const info = invitation.data;

  if (done) {
    return (
      <AuthCard
        title={t("invite.doneTitle")}
        description={t("invite.doneDescription", {
          workspace: info.workspaceName,
          slug: info.workspaceSlug,
          email: info.email,
        })}
        showBackLink={false}
      >
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
      await acceptInvitation({ token, password });
      setDone(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title={t("invite.title", { workspace: info.workspaceName })}
      description={t("invite.description", { name: info.name, email: info.email })}
      showBackLink={false}
    >
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
          {submitting ? t("invite.saving") : t("invite.submit")}
        </Button>
      </form>
    </AuthCard>
  );
}
