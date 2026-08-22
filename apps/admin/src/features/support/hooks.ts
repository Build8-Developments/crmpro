"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminSupportConversation,
  getAdminSupportConversations,
  getAdminSupportSummary,
} from "@/features/support/api";
import type { AdminSupportListParams } from "@/features/support/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useAdminSupportSummary(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.support.summary(),
    queryFn: getAdminSupportSummary,
    enabled: status === "authenticated" && (options?.enabled ?? true),
    // refetchInterval removed
  });
}

export function useAdminSupportConversations(
  params?: AdminSupportListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.support.list(params as Record<string, unknown>),
    queryFn: () => getAdminSupportConversations(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useAdminSupportConversation(id: string | undefined) {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: queryKeys.support.detail(id ?? ""),
    queryFn: () => getAdminSupportConversation(id!),
    enabled: status === "authenticated" && Boolean(id),
    // refetchInterval removed
  });
}
