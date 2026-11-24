"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findWorkspaces } from "@/features/auth/recovery-api";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

/**
 * Shown on the bare domain. Each workspace has its own address; this emails
 * the visitor the ones their address belongs to.
 */
export function FindWorkspace() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setSubmitting(true);
    try {
      await findWorkspaces({ email: address });
      setSentTo(address);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If <span className="font-medium text-foreground">{sentTo}</span> belongs to a workspace,
          we&apos;ve sent you a link to sign in to it.
        </p>
        <Button variant="ghost" size="sm" className="-ml-2 px-2" onClick={() => setSentTo(null)}>
          Use another email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Find your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Every agency signs in on its own address. Enter your work email and we&apos;ll send you
          the link.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="find-email">Work email</Label>
        <div className="relative">
          <AppIcons.mail
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            stroke={1.75}
          />
          <Input
            id="find-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            disabled={submitting}
            className="pl-9"
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={submitting || !email.trim()}>
        {submitting ? (
          <>
            <AppIcons.loader className="size-4 animate-spin" stroke={2} />
            Sending…
          </>
        ) : (
          "Email me my workspace"
        )}
      </Button>
    </form>
  );
}
