"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  replyAdminSupportConversation,
  updateAdminSupportStatus,
} from "@/features/support/api";
import type {
  AdminSupportConversationDetail,
  AdminSupportConversationListItem,
  AdminSupportMessage,
  SupportConversationStatus,
} from "@/features/support/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

function previewOf(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}…` : trimmed;
}

export function useReplyAdminSupport(conversationId: string) {
  const queryClient = useQueryClient();

  return useApiMutation({
    mutationFn: (body: string) =>
      replyAdminSupportConversation(conversationId, body),
    successMessage: "Reply sent to user",
    invalidateKeys: [queryKeys.support.all()],
    onSuccess: (message: AdminSupportMessage) => {
      queryClient.setQueryData(
        queryKeys.support.detail(conversationId),
        (prev: AdminSupportConversationDetail | undefined) => {
          if (!prev) return prev;
          if (prev.messages.some((item) => item.id === message.id)) return prev;
          return {
            ...prev,
            status: "WAITING_ON_USER",
            lastMessageAt: message.createdAt,
            lastMessagePreview: previewOf(message.body),
            adminUnreadCount: 0,
            messages: [...prev.messages, message],
          };
        },
      );

      queryClient.setQueriesData(
        { queryKey: ["support", "list"] },
        (
          prev: { items: AdminSupportConversationListItem[] } | undefined,
        ) => {
          if (!prev?.items) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    status: "WAITING_ON_USER" as const,
                    lastMessageAt: message.createdAt,
                    lastMessagePreview: previewOf(message.body),
                    adminUnreadCount: 0,
                  }
                : item,
            ),
          };
        },
      );
    },
  });
}

export function useUpdateAdminSupportStatus() {
  return useApiMutation({
    mutationFn: ({
      conversationId,
      status,
    }: {
      conversationId: string;
      status: SupportConversationStatus;
    }) => updateAdminSupportStatus(conversationId, status),
    successMessage: "Conversation updated",
    invalidateKeys: [queryKeys.support.all()],
  });
}
