"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
} from "@/features/notifications/api";
import type { NotificationsListParams } from "@/features/notifications/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useNotifications(params?: NotificationsListParams) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => getNotifications(params),
    enabled: status === "authenticated",
  });
}

export function useUnreadNotificationsCount() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const result = await getUnreadCount();
      return result.count;
    },
    enabled: status === "authenticated",
    staleTime: 30 * 1000,
  });
}
