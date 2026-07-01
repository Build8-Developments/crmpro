"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceLookupResult } from "@/types/auth";

interface CredentialsStepProps {
  workspace: WorkspaceLookupResult;
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export function CredentialsStep({
  workspace,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onBack,
  onSubmit,
  isSubmitting,
  errorMessage,
}: CredentialsStepProps) {
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          onSubmit();
        }
      }}
    >
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <AppIcons.arrowLeft className="size-4" stroke={2} />
          Back
        </Button>

        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{workspace.name}</p>
          <h1 className="text-xl font-semibold tracking-tight">Sign in to your workspace</h1>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <AppIcons.loader className="size-4 animate-spin" stroke={2} />
            Signing in...
          </span>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
