import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type SupportConversationStatus =
  | "OPEN"
  | "WAITING_ON_USER"
  | "WAITING_ON_ADMIN"
  | "RESOLVED"
  | "CLOSED";

export type SupportMessageAuthorType = "USER" | "ADMIN";

export interface SupportUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface SupportAdminSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface SupportConversationListItem {
  id: string;
  tenantId: string;
  subject: string;
  status: SupportConversationStatus;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  userUnreadCount: number;
  adminUnreadCount: number;
  createdAt: string;
  closedAt: string | null;
  createdByUser: SupportUserSummary;
  assignedAdmin: SupportAdminSummary | null;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  authorType: SupportMessageAuthorType;
  body: string;
  createdAt: string;
  authorUser: SupportUserSummary | null;
  authorAdmin: SupportAdminSummary | null;
}

export interface SupportConversationDetail extends SupportConversationListItem {
  messages: SupportMessage[];
}

export type SupportConversationsListParams = ListQueryParams & {
  status?: SupportConversationStatus;
};

export type SupportConversationsListResponse =
  PaginatedResponse<SupportConversationListItem>;

export interface CreateSupportConversationInput {
  subject: string;
  body: string;
}

export interface CreateSupportMessageInput {
  body: string;
}
