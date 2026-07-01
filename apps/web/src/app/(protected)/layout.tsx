import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Protected application layout.
 *
 * Wraps every authenticated route in the app shell.
 *
 * TODO(phase-2): enforce auth here (client-side protected shell):
 *   - bootstrap the session (GET /auth/me) via AuthProvider
 *   - validate/refresh the access token (httpOnly refresh cookie)
 *   - redirect to /login when unauthenticated
 * No auth is enforced in Phase 1.
 */
export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
