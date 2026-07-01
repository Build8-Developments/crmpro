"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { findRouteByPath } from "@/config/routes";
import { quickActions } from "@/config/quick-actions";
import { usePermissions } from "@/hooks/use-permissions";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";

/* ─── Mock notification data ─────────────────────────────────────────────── */

interface MockNotification {
  id: string;
  title: string;
  body: string;
  ago: string;
  read: boolean;
  icon: (typeof AppIcons)[keyof typeof AppIcons];
}

const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: "1",
    title: "Lead assigned",
    body: "Ahmed Hassan was assigned to you",
    ago: "2m ago",
    read: false,
    icon: AppIcons.leads,
  },
  {
    id: "2",
    title: "Import completed",
    body: "Marketing Q2.csv — 42 leads imported",
    ago: "10m ago",
    read: false,
    icon: AppIcons.imports,
  },
  {
    id: "3",
    title: "Export ready",
    body: "Leads export is ready to download",
    ago: "1h ago",
    read: false,
    icon: AppIcons.exports,
  },
  {
    id: "4",
    title: "User joined",
    body: "Lena Zaid accepted the team invite",
    ago: "3h ago",
    read: true,
    icon: AppIcons.users,
  },
];

/* ─── Command trigger ─────────────────────────────────────────────────────── */

function CommandTrigger({ onOpen }: { onOpen?: () => void }) {
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/mac/i.test(navigator.platform));
  }, []);

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

/* ─── Theme toggle ────────────────────────────────────────────────────────── */

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;

    root.classList.add("theme-transition");
    // Force the browser to apply the transition class before color variables swap.
    void root.offsetWidth;

    root.classList.toggle("dark", nextTheme === "dark");
    root.style.colorScheme = nextTheme;
    localStorage.setItem("crmpro-theme", nextTheme);
    setTheme(nextTheme);

    window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 280);
  };

  const Icon = theme === "dark" ? AppIcons.lightMode : AppIcons.darkMode;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0 rounded-lg transition-all duration-150"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      <Icon className="size-[18px]" stroke={1.75} />
    </Button>
  );
}

/* ─── Notification bell ───────────────────────────────────────────────────── */

function NotificationBadge({ unread }: { unread: number }) {
  return (
    unread > 0 && (
      <span className="absolute right-1 top-1 flex size-[14px] items-center justify-center rounded-full bg-primary text-[9px] font-bold leading-none text-primary-foreground">
        {unread}
      </span>
    )
  );
}

function NotificationPanelContent({ unread }: { unread: number }) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Notifications</span>
        {unread > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {unread} new
          </span>
        )}
      </div>

      {/* Items */}
      <div className="max-h-72 overflow-y-auto">
        <div className="divide-y">
          {MOCK_NOTIFICATIONS.map((n) => {
            const Icon = n.icon;
            return (
              <button
                key={n.id}
                type="button"
                className={cn(
                  "group flex w-full items-start gap-3 px-4 py-3 text-left",
                  "transition-colors duration-150 hover:bg-muted/60",
                  !n.read && "bg-primary/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    n.read
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-3.5" stroke={2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-xs font-medium",
                      n.read ? "text-foreground/70" : "text-foreground",
                    )}
                  >
                    {n.title}
                    {!n.read && (
                      <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">
                    {n.ago}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2.5">
        <button
          type="button"
          className="w-full rounded-md py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground"
        >
          Show all notifications
        </button>
      </div>
    </>
  );
}

function DesktopNotificationBell({ unread }: { unread: number }) {
  return (
    <div className="hidden md:block">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 shrink-0 rounded-lg transition-all duration-150"
            aria-label="Notifications"
          >
            <AppIcons.notifications className="size-[18px]" stroke={1.75} />
            <NotificationBadge unread={unread} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={10}
          collisionPadding={8}
          className="w-80 p-0"
        >
          <NotificationPanelContent unread={unread} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MobileNotificationBell({
  unread,
  open,
  onOpenChange,
}: {
  unread: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }

    if (mounted) {
      setClosing(true);
      const timeout = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 160);

      return () => window.clearTimeout(timeout);
    }
  }, [mounted, open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedTrigger = triggerRef.current?.contains(target);
      const clickedPanel = panelRef.current?.contains(target);

      if (!clickedTrigger && !clickedPanel) {
        onOpenChange(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onOpenChange, open]);

  return (
    <div className="md:hidden">
      <div ref={triggerRef}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 shrink-0 rounded-lg transition-all duration-150"
          aria-label="Notifications"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <AppIcons.notifications className="size-[18px]" stroke={1.75} />
          <NotificationBadge unread={unread} />
        </Button>
      </div>

      {mounted && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default bg-transparent md:hidden"
            onClick={() => onOpenChange(false)}
          />
          <div
            ref={panelRef}
            data-state={closing ? "closed" : "open"}
            className="mobile-notification-panel fixed inset-x-2 top-[3.75rem] z-50 max-h-[calc(100dvh-4.25rem)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl md:hidden"
          >
            <NotificationPanelContent unread={unread} />
          </div>
        </>
      )}
    </div>
  );
}

function NotificationBell({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <>
      <MobileNotificationBell
        unread={unread}
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
      />
      <DesktopNotificationBell unread={unread} />
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

  const name = user?.name ?? "CRM User";
  const roleName = user?.roleName ?? "Member";
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
            router.push("/settings");
          }}
        >
          <AppIcons.profile className="size-4" stroke={1.75} />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            onOpenChange?.(false);
            router.push("/settings");
          }}
        >
          <AppIcons.settings className="size-4" stroke={1.75} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* TODO(phase-2): call authApi.logout(), clear auth store, redirect. */}
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            onOpenChange?.(false);
            router.push("/login");
          }}
        >
          <AppIcons.logout className="size-4" stroke={1.75} />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Topbar ──────────────────────────────────────────────────────────────── */

export function Topbar() {
  const pathname = usePathname();
  const route = findRouteByPath(pathname);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openMobileSidebar = useUIStore((s) => s.openMobileSidebar);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const [mobileOverlay, setMobileOverlay] = useState<
    "notifications" | "create" | "user" | null
  >(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setMobileOverlay(null);
    }
  }, [commandPaletteOpen]);

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

      {/* Desktop collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden h-8 w-8 rounded-lg transition-all duration-150 md:inline-flex"
        aria-label="Toggle sidebar"
        onClick={toggleSidebar}
      >
        {collapsed ? (
          <AppIcons.sidebarExpand className="size-4" stroke={2} />
        ) : (
          <AppIcons.sidebarCollapse className="size-4" stroke={2} />
        )}
      </Button>

      {/* Left: page title + subtitle */}
      <div className="flex min-w-0 flex-1 flex-col justify-center xl:flex-none">
        <h1 className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {route?.label ?? "CRMPro"}
        </h1>
        {route?.subtitle && (
          <p className="hidden truncate text-[11px] leading-tight text-muted-foreground sm:block">
            {route.subtitle}
          </p>
        )}
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
        <ThemeToggle />
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
