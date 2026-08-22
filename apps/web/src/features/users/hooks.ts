"use client";

import { useQuery } from "@tanstack/react-query";
import { checkEmail, getRoles, getUserById, getUserQuota, getUsers } from "@/features/users/api";
import type { UsersListParams } from "@/features/users/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useUsers(
  params?: UsersListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => getUsers(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useUser(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ""),
    queryFn: () => getUserById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useRoles() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: getRoles,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useCheckEmail(email: string) {
  const status = useAuthStore((state) => state.status);
  
  // Basic HTML5 email regex
  const isValidEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);

  return useQuery({
    queryKey: queryKeys.users.checkEmail(email),
    queryFn: () => checkEmail(email),
    enabled: status === "authenticated" && isValidEmail,
    staleTime: 60_000,
    retry: false,
  });
}

export function useUserQuota() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.users.quota(),
    queryFn: getUserQuota,
    enabled: status === "authenticated",
  });
}
