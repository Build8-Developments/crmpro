"use client";

import { useQuery } from "@tanstack/react-query";
import { getSessions } from "@/features/auth/api";
import { getNotificationPreferences } from "@/features/settings/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useSessions() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.auth.sessions(),
    queryFn: async () => {
      const data = await getSessions();
      return data.items;
    },
    enabled: status === "authenticated",
  });
}

export function useNotificationPreferences(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.settings.notificationPreferences(),
    queryFn: getNotificationPreferences,
    enabled: status === "authenticated" && (options?.enabled ?? true),
  });
}
