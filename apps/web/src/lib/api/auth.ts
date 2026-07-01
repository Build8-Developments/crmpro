import { apiClient } from "@/lib/api/client";
import type { AuthUser } from "@/types/auth";

/**
 * Auth API surface.
 *
 * Phase 1 scaffold: the endpoint signatures match the target CRM API contract
 * (see docs/web/phase-01.md §4). No refresh flow is implemented yet.
 */

export interface LoginPayload {
  /** Tenant slug used for tenant-scoped login. */
  tenantSlug: string;
  email: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  /** POST /auth/login — returns access token in body, refresh token in cookie. */
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResult>("/auth/login", payload),

  /**
   * POST /auth/refresh — backend reads the httpOnly refresh cookie and rotates
   * it, returning a fresh access token.
   *
   * TODO(phase-2): call this from the API client on 401 and from AuthProvider
   * on session bootstrap.
   */
  refresh: () => apiClient.post<{ accessToken: string }>("/auth/refresh"),

  /** POST /auth/logout — revokes the session and clears the refresh cookie. */
  logout: () => apiClient.post<void>("/auth/logout"),

  /** GET /auth/me — current authenticated user + permissions. */
  me: () => apiClient.get<AuthUser>("/auth/me"),
};
