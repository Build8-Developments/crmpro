"use client";

import Link from "next/link";
import { useState } from "react";
import { useClientValue } from "@/hooks/use-client-value";
import { usePathname, useRouter } from "next/navigation";
import { PRODUCT_NAME } from "@/components/brand/product-logo";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  applyThemePreference,
  readThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { getRouteBreadcrumbs } from "@/config/routes";
import { quickActions } from "@/config/quick-actions";
import { usePermissions } from "@/hooks/use-permissions";
import { useLogout } from "@/features/auth/hooks/use-auth-actions";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useOrganizationSettingsNav } from "@/features/organization/hooks/use-organization-settings-nav";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBreadcrumbStore } from "@/stores/breadcrumb-store";

/* ─── Command trigger ─────────────────────────────────────────────────────── */

function CommandTrigger({ onOpen }: { onOpen?: () => void }) {
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const isMac = useClientValue(() => /mac/i.test(navigator.platform), false);

  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openCommandPalette();
      }}
      className={cn(
        "group flex w-full min-w-[280px] max-w-md items-center gap-2 rounded-lg border border-input/60 bg-muted/40",
        "px-3 py-1.5 text-sm text-muted-foreground",
        "transition-all duration-150 hover:border-input hover:bg-muted/70 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <AppIcons.search
        className="size-3.5 shrink-0 transition-colors duration-150 group-hover:text-foreground"
        stroke={2}
      />
      <span className="flex-1 select-none text-left text-[13px]">
        Search or jump to...
      </span>
      <kbd className="pointer-events-none hidden select-none items-center rounded border border-input/60 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

function CompactCommandTrigger({ onOpen }: { onOpen?: () => void }) {
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 rounded-lg transition-all duration-150 xl:hidden"
      aria-label="Open command palette"
      title="Search or jump to..."
      onClick={() => {
        onOpen?.();
        openCommandPalette();
      }}
    >
      <AppIcons.search className="size-[18px]" stroke={1.75} />
    </Button>
  );
}

/* ─── Quick actions ───────────────────────────────────────────────────────── */

function QuickActions({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const { canAccessRoute } = usePermissions();
  const visible = quickActions.filter(canAccessRoute);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className={cn(
            "h-8 w-8 gap-1.5 rounded-md px-0 text-xs font-semibold shadow-xs sm:w-auto sm:px-2.5",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "ring-1 ring-primary/20 transition-all duration-150",
            "dark:ring-primary/30",
          )}
        >
          <AppIcons.create className="size-3.5" stroke={2.5} />
          <span className="hidden sm:inline">New</span>
          <span className="mx-0.5 hidden h-3.5 w-px bg-primary-foreground/25 sm:block" />
          <AppIcons.chevronDown
            className="hidden size-3 text-primary-foreground/85 sm:block"
            stroke={2.5}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {visible.map((action) => {
          const Icon = action.icon;
          return (
            <DropdownMenuItem
              key={action.label}
              onSelect={() => {
                onOpenChange?.(false);
                router.push(action.href);
              }}
            >
              <Icon className="size-4" stroke={1.75} />
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Breadcrumbs ─────────────────────────────────────────────────────────── */

function Breadcrumbs() {
  const pathname = usePathname();
  const trail = useBreadcrumbStore((state) => state.trail);
  const crumbs = [...getRouteBreadcrumbs(pathname), ...trail];

  if (crumbs.length === 0) {
    return <span className="text-[13px] font-semibold">{PRODUCT_NAME}</span>;
  }

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-[13px]">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className={cn(
                "flex min-w-0 items-center gap-1",
                // On phones show only the current page and its parent.
                index < crumbs.length - 2 && "hidden sm:flex",
              )}
            >
              {index > 0 ? (
                <AppIcons.chevronRight
                  className="size-3.5 shrink-0 text-muted-foreground/60"
                  stroke={2}
                  aria-hidden
                />
              ) : null}
              {last || !crumb.href ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn(
                    "truncate",
                    last
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ─── Theme (inside the user menu) ────────────────────────────────────────── */

function ThemeMenu() {
  // Menu content only renders client-side (when opened), so reading
  // localStorage during the first render is safe here.
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);

  return (
    <>
      <DropdownMenuLabel className="pb-0.5 pt-1.5 text-[11px] font-medium text-muted-foreground">
        Theme
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={preference}
        onValueChange={(value) => {
          const next = value as ThemePreference;
          setPreference(next);
          applyThemePreference(next);
        }}
      >
        <DropdownMenuRadioItem value="light" onSelect={(e) => e.preventDefault()}>
          <AppIcons.lightMode className="size-4" stroke={1.75} />
          Light
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark" onSelect={(e) => e.preventDefault()}>
          <AppIcons.darkMode className="size-4" stroke={1.75} />
          Dark
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system" onSelect={(e) => e.preventDefault()}>
          <AppIcons.monitor className="size-4" stroke={1.75} />
          System
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  );
}

/* ─── User menu ───────────────────────────────────────────────────────────── */

function UserMenu({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoggingOut } = useLogout();
  const { firstHref: settingsHref } = useOrganizationSettingsNav();

  const name = user?.name ?? "CRM User";
  const roleName = user?.role.name ?? "Member";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 shrink-0 gap-1 rounded-lg px-1 transition-all duration-150 sm:gap-2 sm:px-1.5"
        >
          <Avatar className="size-6 ring-1 ring-border">
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col items-start leading-none md:flex">
            <span className="text-[13px] font-medium">{name}</span>
            <span className="text-[11px] text-muted-foreground">{roleName}</span>
          </div>
          <AppIcons.chevronDown
            className="hidden size-3 text-muted-foreground sm:block"
            stroke={2.5}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="flex flex-col pb-1">
          <span className="text-sm">{name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {roleName}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            onOpenChange?.(false);
            router.push("/account");
          }}
        >
          <AppIcons.profile className="size-4" stroke={1.75} />
          My account
        </DropdownMenuItem>
        {settingsHref ? (
          <DropdownMenuItem
            onSelect={() => {
              onOpenChange?.(false);
              router.push(settingsHref);
            }}
          >
            <AppIcons.settings className="size-4" stroke={1.75} />
            Organization settings
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <ThemeMenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onSelect={() => {
            onOpenChange?.(false);
            void logout();
          }}
        >
          <AppIcons.logout className="size-4" stroke={1.75} />
          {isLoggingOut ? "Signing out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Topbar ──────────────────────────────────────────────────────────────── */

export function Topbar() {
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const [mobileOverlay, setMobileOverlay] = useState<
    "notifications" | "create" | "user" | null
  >(null);

  // Opening the command palette closes any mobile overlay (adjusted during
  // render rather than in an effect).
  const [paletteWasOpen, setPaletteWasOpen] = useState(commandPaletteOpen);
  if (commandPaletteOpen !== paletteWasOpen) {
    setPaletteWasOpen(commandPaletteOpen);
    if (commandPaletteOpen) setMobileOverlay(null);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-2 sm:px-3 md:px-4">
      {/* Mobile drawer toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-lg md:hidden"
        aria-label="Open navigation"
        onClick={openMobileSidebar}
      >
        <AppIcons.menu className="size-4" stroke={2} />
      </Button>

      {/* Left: where am I */}
      <div className="flex min-w-0 flex-1 items-center xl:flex-none">
        <Breadcrumbs />
      </div>

      {/* Center: command palette trigger */}
      <div className="ml-auto hidden flex-1 justify-center px-4 lg:px-8 xl:flex">
        <CommandTrigger onOpen={() => setMobileOverlay(null)} />
      </div>

      {/* Right: notifications · quick actions · divider · user */}
      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <CompactCommandTrigger onOpen={() => setMobileOverlay(null)} />
        <NotificationBell
          mobileOpen={mobileOverlay === "notifications"}
          onMobileOpenChange={(open) =>
            setMobileOverlay(open ? "notifications" : null)
          }
        />
        <QuickActions
          open={mobileOverlay === "create"}
          onOpenChange={(open) => setMobileOverlay(open ? "create" : null)}
        />
        <Separator
          orientation="vertical"
          className="mx-1.5 hidden h-5 opacity-50 sm:block"
        />
        <UserMenu
          open={mobileOverlay === "user"}
          onOpenChange={(open) => setMobileOverlay(open ? "user" : null)}
        />
      </div>
    </header>
  );
}
