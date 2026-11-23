"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/recovery-api";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";

export function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState(searchParams.get("workspace") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset({ tenantSlug: workspace.trim().toLowerCase(), email: email.trim() });
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
            <span className="font-medium text-foreground">{workspace}</span>, a link to set a new
            password is on its way. It works once, for 30 minutes.
          </>
        }
      >
        <span />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your workspace and email — we'll send you a link to choose a new one."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="workspace">Workspace</Label>
          <Input
            id="workspace"
            value={workspace}
            onChange={(event) => setWorkspace(event.target.value)}
            placeholder="prime-estates"
            autoCapitalize="none"
            required
          />
        </div>
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
        <Button type="submit" className="w-full" disabled={submitting || !workspace.trim() || !email.trim()}>
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
