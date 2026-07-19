"use client";

import type { ReactNode } from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";

/**
 * Application shell: sidebar + full-width content surface.
 * Light mode uses a subtle inset frame; dark mode stays flush.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-sidebar p-1 transition-colors duration-200 dark:bg-sidebar dark:p-0">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm transition-colors duration-200 dark:rounded-none dark:border-0 dark:shadow-none">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
