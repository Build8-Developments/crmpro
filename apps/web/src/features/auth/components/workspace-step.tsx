"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WorkspaceLookupStatus } from "@/features/auth/hooks/use-workspace-lookup";
import type { WorkspaceLookupResult } from "@/types/auth";

interface WorkspaceStepProps {
  slugInput: string;
  onSlugChange: (value: string) => void;
  status: WorkspaceLookupStatus;
  workspace: WorkspaceLookupResult | null;
  errorMessage: string | null;
  onContinue: () => void;
}

export function WorkspaceStep({
  slugInput,
  onSlugChange,
  status,
  workspace,
  errorMessage,
  onContinue,
}: WorkspaceStepProps) {
  const canContinue = status === "exists" && workspace !== null;
  const showMissing = status === "missing";
  const showExists = status === "exists" && workspace;
  const showChecking = status === "checking";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Enter your workspace</h1>
        <p className="text-sm text-muted-foreground">
          Use the workspace slug provided by your organization.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="workspace-slug">Workspace slug</Label>
        <div className="relative">
          <Input
            id="workspace-slug"
            value={slugInput}
            onChange={(event) => onSlugChange(event.target.value)}
            placeholder="prime-estates"
            autoComplete="organization"
            autoFocus
            spellCheck={false}
            aria-invalid={showMissing}
            className={cn(
              "pr-10",
              showExists && "border-emerald-500/70 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
              showMissing && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            )}
          />
          {showChecking && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              <AppIcons.loader className="size-4 animate-spin" stroke={2} />
            </span>
          )}
          {showExists && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-emerald-600 dark:text-emerald-400">
              <AppIcons.check className="size-4" stroke={2.5} />
            </span>
          )}
        </div>

        {showExists && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <AppIcons.check className="size-3.5" stroke={2.5} />
            {workspace.name}
          </p>
        )}

        {showMissing && (
          <p className="text-sm text-destructive">
            Workspace not found. Check the slug and try again.
          </p>
        )}

        {status === "error" && errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={!canContinue || showChecking}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
