"use client";

import { useRouter } from "next/navigation";
import { logoutAllSessions } from "@/features/auth/api";
import {
  changePassword,
  updateMe,
  updateNotificationPreferences,
  type ChangePasswordInput,
  type UpdateMeInput,
} from "@/features/account/api";
import type { UpdateNotificationPreferencesInput } from "@/features/account/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { getQueryClient } from "@/lib/query/query-client";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthUser } from "@/types/auth";
import { PERFORMANCE_QUERY_KEY } from "@/features/performance/hooks";

/**
 * PATCH /me answers without the startup-only fields (tenant.access): keep
 * those from the current user instead of dropping them.
 */
function mergeUpdatedUser(updated: AuthUser): AuthUser {
  const current = useAuthStore.getState().user;
  if (!current) return updated;
  return { ...current, ...updated, tenant: { ...current.tenant, ...updated.tenant } };
}

export function useUpdateMe() {
  const setUser = useAuthStore((s) => s.setUser);

  return useApiMutation({
    mutationFn: (input: UpdateMeInput) => updateMe(input),
    successMessage: "Profile updated",
    invalidateKeys: [queryKeys.auth.me(), queryKeys.users.all()],
    onSuccess: (updated) => {
      setUser(mergeUpdatedUser(updated));
    },
  });
}

/** Show my name on the My performance leaderboard, or appear as "A teammate". */
export function useUpdateLeaderboardVisibility() {
  const setUser = useAuthStore((s) => s.setUser);

  return useApiMutation({
    mutationFn: (showOnLeaderboard: boolean) => updateMe({ showOnLeaderboard }),
    successMessage: "Leaderboard setting saved",
    invalidateKeys: [queryKeys.auth.me(), PERFORMANCE_QUERY_KEY],
    onSuccess: (updated) => {
      setUser(mergeUpdatedUser(updated));
    },
  });
}

export function useChangePassword() {
  return useApiMutation({
    mutationFn: (input: ChangePasswordInput) => changePassword(input),
    successMessage: "Password changed. Other devices were signed out.",
    invalidateKeys: [queryKeys.auth.sessions()],
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
