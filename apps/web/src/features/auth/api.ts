import { apiClient } from "@/lib/api/client";
import type {
  AuthUser,
  UserAuthorization,
  WorkspaceLookupResult,
} from "@/types/auth";

export interface LoginPayload {
  tenantSlug: string;
  email: string;
  password: string;
  deviceName?: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export function lookupWorkspace(slug: string) {
  return apiClient.get<WorkspaceLookupResult>(
    `/public/workspaces/${encodeURIComponent(slug)}`,
    { skipAuth: true, skipRefresh: true },
  );
}

export function login(payload: LoginPayload) {
  return apiClient.post<LoginResult>("/auth/login", payload, {
    skipAuth: true,
    skipRefresh: true,
  });
}

export function refreshSession() {
  return apiClient.post<{ accessToken: string }>("/auth/refresh", undefined, {
    skipAuth: true,
    skipRefresh: true,
  });
}

export function logout() {
  return apiClient.post<void>("/auth/logout");
}

export function logoutAllSessions() {
  return apiClient.post<void>("/auth/logout-all");
}

export function getCurrentUser() {
  return apiClient.get<AuthUser>("/auth/me");
}

export function getPermissions() {
  return apiClient.get<UserAuthorization>("/auth/permissions");
}

export interface AuthSession {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export function getSessions() {
  return apiClient.get<{ items: AuthSession[] }>("/auth/sessions");
}

/** @deprecated Prefer named exports — kept for existing auth action hooks. */
export const authApi = {
  lookupWorkspace,
  login,
  refresh: refreshSession,
  logout,
  logoutAll: logoutAllSessions,
  me: getCurrentUser,
  permissions: getPermissions,
  sessions: getSessions,
};
