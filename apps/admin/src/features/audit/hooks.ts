"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAuditLogById,
  getAuditLogs,
  getSecurityEventById,
  getSecurityEvents,
} from "@/features/audit/api";
import type {
  AuditListParams,
  SecurityEventsListParams,
} from "@/features/audit/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useAuditLogs(
  params?: AuditListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.audit.list(
      params as Parameters<typeof queryKeys.audit.list>[0],
    ),
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

export function useSecurityEvents(
  params?: SecurityEventsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.audit.securityEvents(
      params as Parameters<typeof queryKeys.audit.securityEvents>[0],
    ),
    queryFn: () => getSecurityEvents(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useSecurityEvent(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.audit.securityEvent(id ?? ""),
    queryFn: () => getSecurityEventById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
