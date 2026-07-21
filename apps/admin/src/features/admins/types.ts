import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export interface AdminRoleSummary {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface AdminPermissionSummary {
  id: string;
  key: string;
  description: string | null;
}

export interface AdminRoleDetail extends AdminRoleSummary {
  permissions: AdminPermissionSummary[];
}

export interface AdminListItem {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminDetail {
  id: string;
  email: string;
  fullName: string;
  role: AdminRoleSummary;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  activeSessionsCount: number;
}

export interface AdminNoteAuthor {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminNoteItem {
  id: string;
  content: string;
  author: AdminNoteAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
}

export interface UpdateAdminInput {
  email?: string;
  fullName?: string;
  roleId?: string;
}

export interface ResetAdminPasswordInput {
  newPassword: string;
}

export interface CreateAdminNoteInput {
  content: string;
}

export interface UpdateAdminNoteInput {
  content: string;
}

export type AdminsListParams = ListQueryParams & {
  roleId?: string;
  isActive?: boolean;
};

export type AdminsListResponse = PaginatedResponse<AdminListItem>;

export type AdminStatusFilter = "all" | "active" | "inactive";
