"use client";

import { useQuery } from "@tanstack/react-query";
import { getRoleById, getRoles } from "@/features/roles/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useRoles(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: getRoles,
    enabled: status === "authenticated" && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useRole(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.roles.detail(id ?? ""),
    queryFn: () => getRoleById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
