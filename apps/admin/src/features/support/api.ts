import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  AdminSupportConversationDetail,
  AdminSupportListParams,
  AdminSupportListResponse,
  AdminSupportMessage,
  AdminSupportSummary,
  SupportConversationStatus,
} from "./types";

export function getAdminSupportSummary() {
  return apiClient.get<AdminSupportSummary>("/support/summary");
}

export function getAdminSupportConversations(params?: AdminSupportListParams) {
  return apiClient.get<AdminSupportListResponse>("/support/conversations", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getAdminSupportConversation(id: string) {
  return apiClient.get<AdminSupportConversationDetail>(
    `/support/conversations/${id}`,
  );
}

export function replyAdminSupportConversation(id: string, body: string) {
  return apiClient.post<AdminSupportMessage>(
    `/support/conversations/${id}/messages`,
    { body },
  );
}

export function updateAdminSupportStatus(
  id: string,
  status: SupportConversationStatus,
) {
  return apiClient.patch<AdminSupportConversationDetail>(
    `/support/conversations/${id}/status`,
    { status },
  );
}
