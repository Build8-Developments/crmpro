"use client";
import { getHomeRoute } from "@/lib/home-route";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/features/auth/api";
import { hydrateAuthAfterLogin } from "@/features/auth/session";
import { authToast } from "@/features/auth/utils/auth-toast";
import { ApiError } from "@/lib/api/client";
import { getQueryClient } from "@/lib/query/query-client";
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
      authToast.signedOut();
      router.replace("/login");
    }
  }, [clearAuth, router]);

  return { logout, isLoggingOut };
}

export function useLogin() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useCallback(
    async (payload: {
      tenantSlug: string;
      email: string;
      password: string;
    }) => {
      setIsSubmitting(true);
      authToast.dismissSignIn();

      try {
        const result = await authApi.login({
          ...payload,
          deviceName: "CRM Web",
        });
        await hydrateAuthAfterLogin(result.accessToken);
        authToast.signInSuccess(result.user.name);
        router.replace(getHomeRoute());
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Unable to sign in. Please try again.";
        authToast.signInFailed(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  return { login, isSubmitting };
}
