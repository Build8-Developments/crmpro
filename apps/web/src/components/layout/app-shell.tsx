"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { ReadOnlyBanner } from "@/components/layout/read-only-banner";
import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useUIStore } from "@/stores/ui-store";

/** First path segment: switching sections animates; moving inside one doesn't. */
function sectionOf(pathname: string) {
  return pathname.split("/")[1] ?? "";
}

/**
 * Application shell: sidebar + full-width content surface.
 * Light mode uses a subtle inset frame; dark mode stays flush.
 *
 * The shell stays mounted across navigation; only the content area changes.
 * It scrolls back to the top on every page change (the browser only restores
 * window scroll, not this inner scroller) and fades the new section in.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const main = useRef<HTMLElement>(null);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);

  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-sidebar p-1 transition-colors duration-200 dark:bg-sidebar dark:p-0">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-sm transition-colors duration-200 dark:rounded-none dark:border-0 dark:shadow-none">
        <Topbar />
        <ReadOnlyBanner />
        <main
          ref={main}
          className="relative flex flex-1 flex-col overflow-y-auto"
        >
          <div
            key={sectionOf(pathname)}
            className="flex flex-1 flex-col motion-safe:animate-slide-in [--slide:0]"
          >
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
