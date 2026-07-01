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

export const authApi = {
  lookupWorkspace: (slug: string) =>
    apiClient.get<WorkspaceLookupResult>(`/public/workspaces/${encodeURIComponent(slug)}`, {
      skipAuth: true,
      skipRefresh: true,
    }),

  login: (payload: LoginPayload) =>
    apiClient.post<LoginResult>("/auth/login", payload, {
      skipAuth: true,
      skipRefresh: true,
    }),

  refresh: () =>
    apiClient.post<{ accessToken: string }>("/auth/refresh", undefined, {
      skipAuth: true,
      skipRefresh: true,
    }),

  me: () => apiClient.get<AuthUser>("/auth/me"),

  permissions: () => apiClient.get<UserAuthorization>("/auth/permissions"),

  logout: () => apiClient.post<void>("/auth/logout"),
};
