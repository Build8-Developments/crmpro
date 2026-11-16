"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { AppIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

export interface SettingsNavItem {
  href: string;
  label: string;
  description?: string;
  icon: AppIcon;
  /** Match only the exact path (for an index section like `/settings`). */
  exact?: boolean;
}

export interface SettingsNavGroup {
  label?: string;
  items: SettingsNavItem[];
}

function isActive(pathname: string, item: SettingsNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Two-pane settings layout used by both "My account" and "Organization
 * settings": section list on the left (wrapping chips on phones), the active
 * section's page on the right. Sections are real routes, so they deep-link.
 */
export function SettingsShell({
  title,
  description,
  groups,
  children,
}: {
  title: string;
  description: string;
  groups: SettingsNavGroup[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const visibleGroups = groups.filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="shrink-0 border-b border-border/60 px-4 py-4 md:w-60 md:border-b-0 md:border-r md:px-3 md:py-5">
        <div className="px-1 md:px-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>

        <nav
          aria-label={title}
          className="mt-3 flex flex-wrap gap-1.5 md:mt-5 md:flex-col md:flex-nowrap md:gap-4"
        >
          {visibleGroups.map((group, index) => (
            <div
              key={group.label ?? index}
              className="contents md:flex md:flex-col md:gap-0.5"
            >
              {group.label ? (
                <p className="hidden px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 md:block">
                  {group.label}
                </p>
              ) : null}
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      "md:rounded-md md:border-transparent md:px-2 md:py-2",
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground md:bg-muted"
                        : "border-border/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      stroke={1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Only the section pane changes; the shell and its nav stay put. */}
      <div
        key={pathname}
        className="min-w-0 flex-1 motion-safe:animate-slide-in [--slide:0.5rem]"
      >
        {children}
      </div>
    </div>
  );
}

/** Standard padded container for a settings section page. */
export function SettingsPageBody({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-5 md:px-8 md:py-6">
      {children}
    </div>
  );
}
