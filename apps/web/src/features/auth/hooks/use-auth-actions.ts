"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/api";
import { hydrateAuthAfterLogin } from "@/features/auth/session";
import { ApiError } from "@/lib/api/client";
import { getQueryClient } from "@/providers/query-provider";
import { useAuthStore } from "@/stores/auth-store";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Clear local session even when the network call fails.
    } finally {
      clearAuth();
      getQueryClient()?.clear();
      setIsLoggingOut(false);
      router.replace("/login");
    }
  }, [clearAuth, router]);

  return { logout, isLoggingOut };
}

export function useLogin() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const login = useCallback(
    async (payload: {
      tenantSlug: string;
      email: string;
      password: string;
    }) => {
      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        const result = await authApi.login({
          ...payload,
          deviceName: "CRM Web",
        });
        await hydrateAuthAfterLogin(result.accessToken);
        router.replace("/dashboard");
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Unable to sign in. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  return { login, isSubmitting, errorMessage, setErrorMessage };
}
