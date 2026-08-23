"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { useRealtimeStream } from "@/hooks/use-realtime";

import { useTabBadge } from "@/hooks/use-tab-badge";

function RealtimeStreamInit() {
  useRealtimeStream();
  useTabBadge();
  return null;
}

/**
 * Root provider tree for the application.
 *
 * Theme switching is handled at the document level in the topbar.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
          <RealtimeStreamInit />
        </TooltipProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
