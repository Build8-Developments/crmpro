import { create } from "zustand";
import type { AuthUser } from "@/types/auth";

/**
 * Auth state.
 *
 * Phase 1 is scaffolding only — there is NO real auth logic here yet.
 * The access token is held in memory (never localStorage); the refresh token
 * lives in an httpOnly cookie managed by the backend.
 *
 * TODO(phase-2): wire login/logout/refresh through AuthProvider + api/auth.ts.
 */
interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;

  setAuth: (payload: { accessToken: string; user: AuthUser }) => void;
  setAccessToken: (accessToken: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: ({ accessToken, user }) =>
    set({ accessToken, user, isAuthenticated: true }),
  setAccessToken: (accessToken) =>
    set({ accessToken, isAuthenticated: Boolean(accessToken) }),
  clearAuth: () =>
    set({ accessToken: null, user: null, isAuthenticated: false }),
}));
