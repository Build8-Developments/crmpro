"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resetPassword } from "@/features/auth/recovery-api";
import { isValidPassword } from "@/features/users/utils/password";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { AuthCard } from "./auth-card";
import { NewPasswordFields } from "./new-password-fields";

export function ResetPasswordPage() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Reset your password" description="This link is incomplete. Request a new one.">
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Password updated"
        description="You were signed out of every device. Sign in with your new password."
        showBackLink={false}
      >
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
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
      toast.error(error instanceof ApiError ? error.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Choose a new password" description="You'll be signed out of every device once it's saved.">
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
          {submitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
