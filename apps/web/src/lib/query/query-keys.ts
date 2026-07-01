import type { AnalyticsDateParams } from "@/features/dashboard/types";
import type { LeadsListParams } from "@/features/leads/types";
import type { NotificationsListParams } from "@/features/notifications/types";
import type { ListQueryParams } from "@/types/pagination";

export const queryKeys = {
  auth: {
    all: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
    permissions: () => ["auth", "permissions"] as const,
  },

  dashboard: {
    all: () => ["dashboard"] as const,
    summary: (params?: AnalyticsDateParams) =>
      ["dashboard", "summary", params ?? {}] as const,
    analytics: (scope: string, params?: AnalyticsDateParams) =>
      ["dashboard", "analytics", scope, params ?? {}] as const,
  },

  leads: {
    all: () => ["leads"] as const,
    list: (params?: LeadsListParams) => ["leads", "list", params ?? {}] as const,
    detail: (id: string) => ["leads", "detail", id] as const,
  },

  pipelines: {
    all: () => ["pipelines"] as const,
    list: (params?: ListQueryParams) =>
      ["pipelines", "list", params ?? {}] as const,
  },

  notifications: {
    all: () => ["notifications"] as const,
    list: (params?: NotificationsListParams) =>
      ["notifications", "list", params ?? {}] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
    detail: (id: string) => ["notifications", "detail", id] as const,
  },

  users: {
    all: () => ["users"] as const,
    list: (params?: ListQueryParams) => ["users", "list", params ?? {}] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },

  roles: {
    all: () => ["roles"] as const,
    list: (params?: ListQueryParams) => ["roles", "list", params ?? {}] as const,
  },
} as const;

export type QueryKeyFactory = typeof queryKeys;
