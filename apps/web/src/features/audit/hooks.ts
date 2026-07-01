"use client";

import { useQuery } from "@tanstack/react-query";
import { getAuditLogById, getAuditLogs } from "@/features/audit/api";
import type { AuditListParams } from "@/features/audit/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useAuditLogs(
  params?: AuditListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: () => getAuditLogs(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useAuditLog(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.audit.detail(id ?? ""),
    queryFn: () => getAuditLogById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
