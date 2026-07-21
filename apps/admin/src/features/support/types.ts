import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type SupportConversationStatus =
  | "OPEN"
  | "WAITING_ON_USER"
  | "WAITING_ON_ADMIN"
  | "RESOLVED"
  | "CLOSED";

export type SupportMessageAuthorType = "USER" | "ADMIN";

export interface SupportTenantSummary {
  id: string;
  name: string;
  slug: string;
}

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

export interface AdminSupportConversationListItem {
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
  tenant: SupportTenantSummary;
  createdByUser: SupportUserSummary;
  assignedAdmin: SupportAdminSummary | null;
}

export interface AdminSupportMessage {
  id: string;
  conversationId: string;
  authorType: SupportMessageAuthorType;
  body: string;
  createdAt: string;
  authorUser: SupportUserSummary | null;
  authorAdmin: SupportAdminSummary | null;
}

export interface AdminSupportConversationDetail
  extends AdminSupportConversationListItem {
  messages: AdminSupportMessage[];
}

export type AdminSupportListParams = ListQueryParams & {
  status?: SupportConversationStatus;
  tenantId?: string;
};

export type AdminSupportListResponse =
  PaginatedResponse<AdminSupportConversationListItem>;

export interface AdminSupportSummary {
  open: number;
  waitingOnAdmin: number;
  unread: number;
}
