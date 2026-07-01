"use client";

import { useEffect, type ReactNode } from "react";
import { hydrateAuthSession } from "@/features/auth/session";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Bootstraps the CRM session on mount via silent refresh (httpOnly cookie).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setStatus = useAuthStore((state) => state.setStatus);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus("bootstrapping");

      try {
        await hydrateAuthSession();
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [clearAuth, setStatus]);

  return children;
}
