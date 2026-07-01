import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Login placeholder.
 *
 * Phase 1: no real form or auth logic.
 * TODO(phase-2): build the tenant-scoped login form (slug + email + password)
 * that calls authApi.login() and stores the access token in the auth store.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight">CRMPro</span>
        </div>

        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authentication is coming soon.
        </p>

        <div className="mt-6">
          {/* Placeholder shortcut into the shell while auth is not wired. */}
          <Button asChild className="w-full">
            <Link href="/dashboard">Continue to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
