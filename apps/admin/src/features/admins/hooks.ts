"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminById,
  getAdminNotes,
  getAdminRoleById,
  getAdminRoles,
  getAdmins,
} from "@/features/admins/api";
import type { AdminsListParams } from "@/features/admins/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useAdmins(
  params?: AdminsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.admins.list(
      params as Parameters<typeof queryKeys.admins.list>[0],
    ),
    queryFn: () => getAdmins(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useAdmin(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.admins.detail(id ?? ""),
    queryFn: () => getAdminById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useAdminRoles(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.admins.roles(),
    queryFn: getAdminRoles,
    enabled: status === "authenticated" && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useAdminRole(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: [...queryKeys.admins.roles(), id ?? ""] as const,
    queryFn: () => getAdminRoleById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useAdminNotes(adminId: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.admins.notes(adminId ?? ""),
    queryFn: () => getAdminNotes(adminId!),
    enabled: status === "authenticated" && Boolean(adminId),
  });
}
