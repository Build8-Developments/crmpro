"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CredentialsStep } from "@/features/auth/components/credentials-step";
import { FindWorkspace } from "@/features/auth/components/find-workspace";
import { useLogin } from "@/features/auth/hooks/use-auth-actions";
import { useHostWorkspace } from "@/features/auth/hooks/use-host-workspace";
import { apexUrl } from "@/lib/workspace-host";

/**
 * Sign-in on a workspace host signs in to that workspace only; the bare
 * domain helps people find their workspace instead.
 */
export function LoginFlow() {
  const { status, workspace, retry } = useHostWorkspace();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isSubmitting } = useLogin();

  if (status === "apex") return <FindWorkspace />;

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">
          {status === "missing" ? "Workspace not found" : "Couldn't reach the workspace"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {status === "missing"
            ? "There's no workspace at this address. Check the link, or find yours by email."
            : "Check your connection and try again."}
        </p>
        <div className="flex gap-2">
          {status === "error" ? (
            <Button variant="outline" onClick={() => void retry()}>
              Try again
            </Button>
          ) : null}
          <Button asChild>
            <a href={apexUrl("/login")}>
              <AppIcons.search className="size-4" stroke={2} />
              Find my workspace
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <CredentialsStep
      workspace={workspace}
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={() =>
        void login({ tenantSlug: workspace.slug, email: email.trim(), password })
      }
      isSubmitting={isSubmitting}
    />
  );
}
