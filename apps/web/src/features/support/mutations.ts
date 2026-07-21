"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  createSupportConversation,
  replySupportConversation,
  resolveSupportConversation,
} from "@/features/support/api";
import type {
  CreateSupportConversationInput,
  CreateSupportMessageInput,
  SupportConversationDetail,
  SupportConversationListItem,
  SupportMessage,
} from "@/features/support/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

function previewOf(body: string): string {
  const trimmed = body.trim();
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}…` : trimmed;
}

export function useCreateSupportConversation() {
  const queryClient = useQueryClient();

  return useApiMutation({
    mutationFn: (input: CreateSupportConversationInput) =>
      createSupportConversation(input),
    successMessage: "Support request sent",
    invalidateKeys: [queryKeys.support.all()],
    onSuccess: (created) => {
      queryClient.setQueryData(
        queryKeys.support.list({ limit: 50 }),
        (prev: { items: SupportConversationListItem[] } | undefined) => {
          if (!prev) return prev;
          if (prev.items.some((item) => item.id === created.id)) return prev;
          return { ...prev, items: [created, ...prev.items] };
        },
      );
    },
  });
}

export function useReplySupportConversation(conversationId: string) {
  const queryClient = useQueryClient();

  return useApiMutation({
    mutationFn: (input: CreateSupportMessageInput) =>
      replySupportConversation(conversationId, input),
    successMessage: "Reply sent",
    invalidateKeys: [queryKeys.support.all()],
    onSuccess: (message: SupportMessage) => {
      queryClient.setQueryData(
        queryKeys.support.detail(conversationId),
        (prev: SupportConversationDetail | undefined) => {
          if (!prev) return prev;
          if (prev.messages.some((item) => item.id === message.id)) return prev;
          return {
            ...prev,
            status: "WAITING_ON_ADMIN",
            lastMessageAt: message.createdAt,
            lastMessagePreview: previewOf(message.body),
            messages: [...prev.messages, message],
          };
        },
      );

      queryClient.setQueriesData(
        { queryKey: ["support", "list"] },
        (prev: { items: SupportConversationListItem[] } | undefined) => {
          if (!prev?.items) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    status: "WAITING_ON_ADMIN" as const,
                    lastMessageAt: message.createdAt,
                    lastMessagePreview: previewOf(message.body),
                  }
                : item,
            ),
          };
        },
      );
    },
  });
}

export function useResolveSupportConversation() {
  return useApiMutation({
    mutationFn: (conversationId: string) =>
      resolveSupportConversation(conversationId),
    successMessage: "Conversation marked resolved",
    invalidateKeys: [queryKeys.support.all()],
  });
}
