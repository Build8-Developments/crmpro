import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateSupportConversationInput,
  CreateSupportMessageInput,
  SupportConversationDetail,
  SupportConversationListItem,
  SupportConversationsListParams,
  SupportConversationsListResponse,
  SupportMessage,
} from "./types";

export function getSupportConversations(params?: SupportConversationsListParams) {
  return apiClient.get<SupportConversationsListResponse>(
    "/support/conversations",
    {
      query: serializeQueryParams({
        limit: 50,
        ...params,
      }),
    },
  );
}

export function getSupportUnreadCount() {
  return apiClient.get<{ count: number }>("/support/conversations/unread-count");
}

export function getSupportConversation(id: string) {
  return apiClient.get<SupportConversationDetail>(
    `/support/conversations/${id}`,
  );
}

export function createSupportConversation(input: CreateSupportConversationInput) {
  return apiClient.post<SupportConversationListItem>(
    "/support/conversations",
    input,
  );
}

export function replySupportConversation(
  id: string,
  input: CreateSupportMessageInput,
) {
  return apiClient.post<SupportMessage>(
    `/support/conversations/${id}/messages`,
    input,
  );
}

export function resolveSupportConversation(id: string) {
  return apiClient.post<SupportConversationListItem>(
    `/support/conversations/${id}/resolve`,
  );
}
