import { apiClient } from "@/lib/api/client";
import { setStoredRefreshToken } from "@/lib/api/refresh-token";
import type { AdminAuthorization, AuthUser } from "@/types/auth";

export interface LoginPayload {
  email: string;
  password: string;
  deviceName?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  admin: AuthUser;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const result = await apiClient.authPost<LoginResult>("/auth/login", payload);
  setStoredRefreshToken(result.refreshToken);
  return result;
}

export async function refreshSession() {
  const { getStoredRefreshToken } = await import("@/lib/api/refresh-token");
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  const result = await apiClient.authPost<{
    accessToken: string;
    refreshToken: string;
  }>("/auth/refresh", { refreshToken });

  setStoredRefreshToken(result.refreshToken);
  return result;
}

export function logout() {
  return apiClient.post<{ message?: string }>("/auth/logout");
}

export function logoutAllSessions() {
  return apiClient.post<{ revokedSessions: number }>("/auth/logout-all");
}

export function getCurrentUser() {
  return apiClient.get<AuthUser>("/auth/me");
}

export function getPermissions() {
  return apiClient.get<AdminAuthorization>("/auth/permissions");
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

export const authApi = {
  login,
  refresh: refreshSession,
  logout,
  logoutAll: logoutAllSessions,
  me: getCurrentUser,
  permissions: getPermissions,
  sessions: getSessions,
};
