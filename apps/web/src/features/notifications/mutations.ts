"use client";

import { markAllAsRead, markAsRead } from "@/features/notifications/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

export function useMarkNotificationRead() {
  return useApiMutation({
    mutationFn: (id: string) => markAsRead(id),
    invalidateKeys: [
      queryKeys.notifications.all(),
      queryKeys.notifications.unreadCount(),
    ],
  });
}

export function useMarkAllNotificationsRead() {
  return useApiMutation({
    mutationFn: () => markAllAsRead(),
    successMessage: "All notifications marked as read",
    invalidateKeys: [
      queryKeys.notifications.all(),
      queryKeys.notifications.unreadCount(),
    ],
  });
}
