"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/providers/query-provider";

/**
 * Root provider tree for the application.
 *
 * Target tree (docs/web/phase-01.md §8):
 *   <QueryProvider>
 *     <AuthProvider>          TODO(phase-2): session bootstrap, login/logout/refresh
 *       <ThemeProvider>        TODO(phase-2): theme switching
 *         <CommandPaletteProvider>   TODO(phase-2): global command registry
 *           {children}
 *
 * Phase 1 wires QueryProvider + TooltipProvider only. The command palette is
 * currently driven by the UI store and rendered inside the app shell.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </QueryProvider>
  );
}
