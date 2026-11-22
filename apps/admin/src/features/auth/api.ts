import { apiClient } from "@/lib/api/client";
import type { AdminAuthorization, AuthUser } from "@/types/auth";

export interface LoginPayload {
  email: string;
  password: string;
  deviceName?: string;
}

export interface LoginResult {
  accessToken: string;
  admin: AuthUser;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  // The API sets the refresh token as an httpOnly cookie.
  return apiClient.authPost<LoginResult>("/auth/login", payload);
}

/** Rotates the httpOnly refresh cookie and returns a new access token. */
export function refreshSession() {
  return apiClient.authPost<{ accessToken: string }>("/auth/refresh");
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
