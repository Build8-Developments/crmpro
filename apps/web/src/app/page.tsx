import { redirect } from "next/navigation";

/**
 * Root entry.
 *
 * Phase 1: send users straight into the shell.
 * TODO(phase-2): redirect to /login when unauthenticated, /dashboard otherwise.
 */
export default function RootPage() {
  redirect("/dashboard");
}
