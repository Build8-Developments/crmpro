import type { ListQueryParams } from "@/types/pagination";

export const queryKeys = {
  auth: {
    all: () => ["auth"] as const,
    me: () => ["auth", "me"] as const,
    permissions: () => ["auth", "permissions"] as const,
    sessions: () => ["auth", "sessions"] as const,
  },

  dashboard: {
    all: () => ["dashboard"] as const,
    summary: () => ["dashboard", "summary"] as const,
  },

  tenants: {
    all: () => ["tenants"] as const,
    list: (params?: ListQueryParams & Record<string, unknown>) =>
      ["tenants", "list", params ?? {}] as const,
    detail: (id: string) => ["tenants", "detail", id] as const,
    usage: (id: string) => ["tenants", "usage", id] as const,
    users: (id: string, params?: ListQueryParams & Record<string, unknown>) =>
      ["tenants", "users", id, params ?? {}] as const,
    notes: (id: string) => ["tenants", "notes", id] as const,
  },

  system: {
    all: () => ["system"] as const,
    health: () => ["system", "health"] as const,
  },

  search: {
    all: () => ["search"] as const,
    query: (q: string) => ["search", q] as const,
  },

  plans: {
    all: () => ["plans"] as const,
    list: (params?: ListQueryParams & Record<string, unknown>) =>
      ["plans", "list", params ?? {}] as const,
    detail: (id: string) => ["plans", "detail", id] as const,
  },

  contracts: {
    all: () => ["contracts"] as const,
    list: (params?: ListQueryParams & Record<string, unknown>) =>
      ["contracts", "list", params ?? {}] as const,
    detail: (id: string) => ["contracts", "detail", id] as const,
  },

  admins: {
    all: () => ["admins"] as const,
    list: (params?: ListQueryParams & Record<string, unknown>) =>
      ["admins", "list", params ?? {}] as const,
    detail: (id: string) => ["admins", "detail", id] as const,
    roles: () => ["admins", "roles"] as const,
    notes: (id: string) => ["admins", "notes", id] as const,
  },

  audit: {
    all: () => ["audit"] as const,
    list: (params?: ListQueryParams & Record<string, unknown>) =>
      ["audit", "list", params ?? {}] as const,
    detail: (id: string) => ["audit", "detail", id] as const,
    securityEvents: (params?: ListQueryParams & Record<string, unknown>) =>
      ["audit", "security-events", params ?? {}] as const,
    securityEvent: (id: string) =>
      ["audit", "security-event", id] as const,
  },

  support: {
    all: () => ["support"] as const,
    summary: () => ["support", "summary"] as const,
    list: (params?: Record<string, unknown>) =>
      ["support", "list", params ?? {}] as const,
    detail: (id: string) => ["support", "detail", id] as const,
  },
};
