"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 30;

export function NotificationsPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canUpdate = can("notification.update");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError, isFetching, refetch } = useNotifications({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    unreadOnly: unreadOnly || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.items ?? [];
  const pagination = data?.pagination;

  const handleSelect = async (notification: Notification) => {
    const href = getNotificationHref(notification);

    if (canUpdate && isNotificationUnread(notification)) {
      try {
        await markRead.mutateAsync(notification.id);
      } catch {
        // Navigate anyway.
      }
    }

    if (href) {
      router.push(href);
    }
  };

  if (!can("notification.read")) {
    return (
      <div className="px-6 py-5 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              You don&apos;t have permission to view notifications.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </p>
        </div>
        {canUpdate && unreadCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            disabled={markAllRead.isPending}
            onClick={() => void markAllRead.mutateAsync()}
          >
            {markAllRead.isPending ? "Updating..." : "Mark all as read"}
          </Button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search notifications..."
              className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setUnreadOnly((current) => !current);
              setPage(1);
            }}
            className={cn(
              "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors",
              unreadOnly
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Unread only
          </button>
        </div>

        {isLoading && !data ? (
          <div className="space-y-3 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Failed to load notifications.
            </p>
            <Button
              className="mt-3"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Retry
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <AppIcons.notifications className="mx-auto size-6 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              No notifications found
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {notifications.map((notification) => {
              const unread = isNotificationUnread(notification);
              const Icon =
                NOTIFICATION_ICONS[notification.type] ?? AppIcons.notifications;
              const href = getNotificationHref(notification);

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30",
                      unread && "bg-primary/[0.03]",
                    )}
                    onClick={() => void handleSelect(notification)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                        unread
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" stroke={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            unread ? "text-foreground" : "text-foreground/80",
                          )}
                        >
                          {notification.title}
                          {unread ? (
                            <span className="ml-1.5 inline-block size-1.5 rounded-full bg-primary align-middle" />
                          ) : null}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      {href ? (
                        <p className="mt-1 text-[11px] text-primary/80">
                          Open related item
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
