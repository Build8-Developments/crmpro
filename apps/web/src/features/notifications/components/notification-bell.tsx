"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useNotifications,
  useUnreadNotificationsCount,
} from "@/features/notifications/hooks";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/features/notifications/mutations";
import type { Notification } from "@/features/notifications/types";
import {
  getNotificationHref,
  isNotificationUnread,
  NOTIFICATION_ICONS,
} from "@/features/notifications/utils/notification-helpers";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const PREVIEW_LIMIT = 8;

function NotificationBadge({ unread }: { unread: number }) {
  if (unread <= 0) return null;

  return (
    <span className="absolute top-1 right-1 flex size-[14px] items-center justify-center rounded-full bg-primary text-[9px] leading-none font-bold text-primary-foreground">
      {unread > 99 ? "99+" : unread}
    </span>
  );
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}) {
  const unread = isNotificationUnread(notification);
  const Icon =
    NOTIFICATION_ICONS[notification.type] ?? AppIcons.notifications;

  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-start gap-3 px-4 py-3 text-left",
        "transition-colors duration-150 hover:bg-muted/60",
        unread && "bg-primary/[0.03]",
      )}
      onClick={() => onSelect(notification)}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
          unread
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" stroke={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs font-medium",
            unread ? "text-foreground" : "text-foreground/70",
          )}
        >
          {notification.title}
          {unread ? (
            <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {notification.message}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/70">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

function NotificationPanelContent({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canUpdate = can("notification.update");
  const { data, isLoading, isError, refetch, isFetching } = useNotifications({
    limit: PREVIEW_LIMIT,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.items ?? [];

  const handleSelect = async (notification: Notification) => {
    const href = getNotificationHref(notification);

    if (canUpdate && isNotificationUnread(notification)) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Still navigate even if mark-as-read fails.
      }
    }

    onClose?.();

    if (href) {
      router.push(href);
    }
  };

  const handleShowAll = () => {
    onClose?.();
    router.push("/notifications");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {unreadCount} new
            </span>
          ) : null}
        </div>
        {canUpdate && unreadCount > 0 ? (
          <button
            type="button"
            className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            disabled={markAllRead.isPending}
            onClick={() => void markAllRead.mutateAsync(undefined)}
          >
            {markAllRead.isPending ? "Updating..." : "Mark all read"}
          </button>
        ) : null}
      </div>

      <div className="max-h-72 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 px-4 py-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="size-7 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t load notifications.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <AppIcons.notifications className="mx-auto size-5 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">
              You&apos;re all caught up
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={(item) => void handleSelect(item)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-4 py-2.5">
        <button
          type="button"
          className="w-full rounded-md py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground"
          onClick={handleShowAll}
        >
          Show all notifications
        </button>
      </div>
    </>
  );
}

function DesktopNotificationBell({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="hidden md:block">
      <DropdownMenu open={open} onOpenChange={setOpen}>
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
          <NotificationPanelContent onClose={() => setOpen(false)} />
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default bg-transparent md:hidden"
            onClick={() => onOpenChange(false)}
          />
          <div
            ref={panelRef}
            data-state="open"
            className="mobile-notification-panel fixed inset-x-2 top-[3.75rem] z-50 max-h-[calc(100dvh-4.25rem)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl md:hidden"
          >
            <NotificationPanelContent onClose={() => onOpenChange(false)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

export function NotificationBell({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { can } = usePermissions();
  const canRead = can("notification.read");
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  if (!canRead) return null;

  return (
    <>
      <MobileNotificationBell
        unread={unreadCount}
        open={mobileOpen}
        onOpenChange={onMobileOpenChange}
      />
      <DesktopNotificationBell unread={unreadCount} />
    </>
  );
}
