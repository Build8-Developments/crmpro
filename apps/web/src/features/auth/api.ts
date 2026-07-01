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

export function getCurrentUser() {
  return apiClient.get<AuthUser>("/auth/me");
}

export function getPermissions() {
  return apiClient.get<UserAuthorization>("/auth/permissions");
}

/** @deprecated Prefer named exports — kept for existing auth action hooks. */
export const authApi = {
  lookupWorkspace,
  login,
  refresh: refreshSession,
  logout,
  me: getCurrentUser,
  permissions: getPermissions,
};
