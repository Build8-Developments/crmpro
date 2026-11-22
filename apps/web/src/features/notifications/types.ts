import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type NotificationType =
  | "LEAD_ASSIGNED"
  | "IMPORT_COMPLETED"
  | "EXPORT_COMPLETED"
  | "LEAD_STAGE_CHANGED"
  | "LEAD_WON"
  | "LEAD_LOST"
  | "FILE_DELETED"
  | "SYSTEM"
  | "SECURITY"
  | "REMINDER"
  | "TASK_ASSIGNED"
  | "TASK_DUE"
  | "TASK_OVERDUE"
  | "TASK_COMPLETED"
  | "SUPPORT_REPLY"
  | "ESCALATION"
  | "ACHIEVEMENT";

export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";

export interface Notification {
  id: string;
  tenantId: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  createdByUserId: string | null;
}

export interface NotificationsListParams extends ListQueryParams {
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  from?: string;
  to?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export type NotificationsListResponse = PaginatedResponse<Notification>;

export interface MarkAllAsReadResponse {
  updated: number;
}
