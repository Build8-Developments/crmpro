import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  MarkAllAsReadResponse,
  Notification,
  NotificationsListParams,
  NotificationsListResponse,
  UnreadCountResponse,
} from "./types";

export function getNotifications(params?: NotificationsListParams) {
  return apiClient.get<NotificationsListResponse>("/notifications", {
    query: serializeQueryParams(params ?? {}),
  });
}

export function getUnreadCount() {
  return apiClient.get<UnreadCountResponse>("/notifications/unread-count");
}

export function getNotificationById(id: string) {
  return apiClient.get<Notification>(`/notifications/${id}`);
}

export function markAsRead(id: string) {
  return apiClient.patch<Notification>(`/notifications/${id}/read`);
}

export function markAllAsRead() {
  return apiClient.patch<MarkAllAsReadResponse>("/notifications/read-all");
}
