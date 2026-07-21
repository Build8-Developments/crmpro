import { create } from "zustand";
import type { AuthStatus, AuthUser, AuthUserRole } from "@/types/auth";
import { setStoredRefreshToken } from "@/lib/api/refresh-token";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  role: AuthUserRole | null;
  permissions: Set<string>;

  setStatus: (status: AuthStatus) => void;
  setAccessToken: (accessToken: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setRole: (role: AuthUserRole | null) => void;
  setPermissions: (permissions: Set<string>) => void;
  clearAuth: () => void;
}

const initialState = {
  status: "bootstrapping" as AuthStatus,
  accessToken: null,
  user: null,
  role: null,
  permissions: new Set<string>(),
};

export const useAuthStore = create<AuthState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setPermissions: (permissions) => set({ permissions }),
  clearAuth: () => {
    setStoredRefreshToken(null);
    set({
      status: "unauthenticated",
      accessToken: null,
      user: null,
      role: null,
      permissions: new Set<string>(),
    });
  },
}));
