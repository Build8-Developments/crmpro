"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";

/**
 * Root provider tree for the application.
 *
 * Theme switching is handled at the document level in the topbar.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
