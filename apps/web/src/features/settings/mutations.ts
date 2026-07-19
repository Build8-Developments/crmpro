"use client";

import { useRouter } from "next/navigation";
import { logoutAllSessions } from "@/features/auth/api";
import { updateUser } from "@/features/users/api";
import { updateNotificationPreferences } from "@/features/settings/api";
import type { UpdateNotificationPreferencesInput } from "@/features/settings/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { getQueryClient } from "@/lib/query/query-client";
import { useAuthStore } from "@/stores/auth-store";

export function useUpdateProfileName() {
  const setUser = useAuthStore((s) => s.setUser);

  return useApiMutation({
    mutationFn: ({
      userId,
      fullName,
    }: {
      userId: string;
      fullName: string;
    }) => updateUser(userId, { fullName }),
    successMessage: "Profile updated",
    invalidateKeys: [queryKeys.auth.me(), queryKeys.users.all()],
    onSuccess: (updated) => {
      const current = useAuthStore.getState().user;
      if (!current) return;
      setUser({
        ...current,
        name: updated.fullName,
      });
    },
  });
}

export function useUpdateNotificationPreferences() {
  return useApiMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      updateNotificationPreferences(input),
    successMessage: "Notification preferences saved",
    invalidateKeys: [queryKeys.settings.notificationPreferences()],
  });
}

export function useLogoutAllSessions() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useApiMutation({
    mutationFn: () => logoutAllSessions(),
    successMessage: "Signed out from all devices",
    onSuccess: () => {
      clearAuth();
      getQueryClient()?.clear();
      router.replace("/login");
    },
  });
}
