"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getSupportConversation,
  getSupportConversations,
  getSupportUnreadCount,
} from "@/features/support/api";
import type { SupportConversationsListParams } from "@/features/support/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useSupportConversations(
  params?: SupportConversationsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.support.list(params as Record<string, unknown>),
    queryFn: () => getSupportConversations(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useSupportConversation(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.support.detail(id ?? ""),
    queryFn: () => getSupportConversation(id!),
    enabled: status === "authenticated" && Boolean(id),
    refetchInterval: id ? 5_000 : false,
  });
}

export function useSupportUnreadCount(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.support.unreadCount(),
    queryFn: async () => {
      const data = await getSupportUnreadCount();
      return data.count;
    },
    enabled: status === "authenticated" && (options?.enabled ?? true),
    refetchInterval: 30_000,
  });
}
