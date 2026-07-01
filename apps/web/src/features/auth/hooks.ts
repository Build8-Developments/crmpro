"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentUser, getPermissions } from "@/features/auth/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useCurrentUser() {
  const status = useAuthStore((state) => state.status);
  const cachedUser = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: getCurrentUser,
    enabled: status === "authenticated",
    initialData: cachedUser ?? undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePermissions() {
  const status = useAuthStore((state) => state.status);
  const cachedPermissions = useAuthStore((state) => state.permissions);

  return useQuery({
    queryKey: queryKeys.auth.permissions(),
    queryFn: getPermissions,
    enabled: status === "authenticated",
    select: (data) => data.permissions,
    initialData: cachedPermissions.size
      ? { permissions: [...cachedPermissions], role: null }
      : undefined,
    staleTime: 5 * 60 * 1000,
  });
}
