"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FindWorkspace } from "@/features/auth/components/find-workspace";
import { useHostWorkspace } from "@/features/auth/hooks/use-host-workspace";
import { requestPasswordReset } from "@/features/auth/recovery-api";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";

export function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const { status, workspace } = useHostWorkspace();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (!workspace) return;
      await requestPasswordReset({ tenantSlug: workspace.slug, email: email.trim() });
      setSent(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthCard
        title="Check your email"
        description={
          <>
            If <span className="font-medium text-foreground">{email}</span> has an account in{" "}
            <span className="font-medium text-foreground">{workspace?.name}</span>, a link to set a new
            password is on its way. It works once, for 30 minutes.
          </>
        }
      >
        <span />
      </AuthCard>
    );
  }

  // Passwords belong to a workspace: on the bare domain, find it first.
  if (status === "apex") {
    return (
      <AuthCard title="" showBackLink={false}>
        <FindWorkspace />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description={
        workspace
          ? `Enter the email you use in ${workspace.name} and we'll send you a link to choose a new password.`
          : "Enter your email and we'll send you a link to choose a new password."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting || !workspace || !email.trim()}>
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
