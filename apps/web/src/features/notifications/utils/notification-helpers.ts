import { AppIcons, type AppIcon } from "@/components/icons/app-icons";
import type {
  Notification,
  NotificationType,
} from "@/features/notifications/types";

export const NOTIFICATION_ICONS: Record<NotificationType, AppIcon> = {
  LEAD_ASSIGNED: AppIcons.leads,
  LEAD_STAGE_CHANGED: AppIcons.leads,
  LEAD_WON: AppIcons.leads,
  LEAD_LOST: AppIcons.leads,
  IMPORT_COMPLETED: AppIcons.imports,
  EXPORT_COMPLETED: AppIcons.exports,
  FILE_DELETED: AppIcons.files,
  SECURITY: AppIcons.alertCircle,
  REMINDER: AppIcons.notifications,
  SYSTEM: AppIcons.notifications,
  TASK_ASSIGNED: AppIcons.users,
  TASK_DUE: AppIcons.users,
  TASK_OVERDUE: AppIcons.users,
  TASK_COMPLETED: AppIcons.users,
  SUPPORT_REPLY: AppIcons.lifeBuoy,
};

function metaString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function getNotificationHref(notification: Notification): string | null {
  const leadId = metaString(notification.metadata, "leadId");
  const href = metaString(notification.metadata, "href");
  const conversationId = metaString(notification.metadata, "conversationId");

  switch (notification.type) {
    case "LEAD_ASSIGNED":
    case "LEAD_STAGE_CHANGED":
    case "LEAD_WON":
    case "LEAD_LOST":
    case "TASK_ASSIGNED":
    case "TASK_DUE":
    case "TASK_OVERDUE":
    case "TASK_COMPLETED":
      return leadId ? `/leads?id=${encodeURIComponent(leadId)}` : "/leads";
    case "IMPORT_COMPLETED":
      return "/imports";
    case "EXPORT_COMPLETED":
      return "/exports";
    case "FILE_DELETED":
      return "/files";
    case "SECURITY":
      return "/account/security";
    case "REMINDER":
      return "/leads";
    case "SUPPORT_REPLY":
      return (
        href ??
        (conversationId
          ? `/support?id=${encodeURIComponent(conversationId)}`
          : "/support")
      );
    case "SYSTEM":
    default:
      return href;
  }
}

export function getNotificationIcon(type: NotificationType): AppIcon {
  return NOTIFICATION_ICONS[type] ?? AppIcons.notifications;
}

export function isNotificationUnread(notification: Notification): boolean {
  return notification.status === "UNREAD";
}
