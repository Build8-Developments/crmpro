"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { workspaceLoginHref } from "@/lib/workspace-host";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { acceptInvitation, getInvitation } from "@/features/auth/recovery-api";
import { isValidPassword } from "@/features/users/utils/password";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";
import { NewPasswordFields } from "./new-password-fields";

export function AcceptInvitePage() {
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
      <AuthCard
        title="This invitation can't be used"
        description="It may have expired, been replaced by a newer one, or already been accepted. Ask whoever invited you to send it again."
      >
        <span />
      </AuthCard>
    );
  }

  if (invitation.isLoading || !invitation.data) {
    return (
      <AuthCard title="Opening your invitation…" showBackLink={false}>
        <Skeleton className="h-24 w-full" />
      </AuthCard>
    );
  }

  const info = invitation.data;

  if (done) {
    return (
      <AuthCard
        title={`Welcome to ${info.workspaceName}`}
        description={
          <>
            Your account is ready. Sign in as{" "}
            <span className="font-medium text-foreground">{info.email}</span>.
          </>
        }
        showBackLink={false}
      >
        <Button asChild className="w-full">
          <a href={workspaceLoginHref(info.workspaceSlug)}>Sign in</a>
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
      toast.error(error instanceof ApiError ? error.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title={`Join ${info.workspaceName}`}
      description={
        <>
          Hi {info.name} — choose a password for{" "}
          <span className="font-medium text-foreground">{info.email}</span> to activate your account.
        </>
      }
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
          {submitting ? "Activating…" : "Activate my account"}
        </Button>
      </form>
    </AuthCard>
  );
}
