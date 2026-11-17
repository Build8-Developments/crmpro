import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export interface UserRole {
  id: string;
  name: string;
}

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  role: UserRole;
  team: { id: string; name: string } | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserListItem {
  permissions: string[];
  activeSessionCount: number;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
  teamId?: string;
}

export interface UpdateUserInput {
  fullName: string;
}

export interface UpdateUserRoleInput {
  roleId: string;
}

export interface ResetUserPasswordInput {
  newPassword: string;
}

export type UsersListParams = ListQueryParams & {
  roleId?: string;
  teamId?: string;
  isActive?: boolean;
  sortBy?: "name" | "email" | "createdAt" | "updatedAt";
};

export type UsersListResponse = PaginatedResponse<UserListItem>;

export type UsersSortField = "name" | "email" | "createdAt" | "updatedAt";

export type UserStatusFilter = "all" | "active" | "inactive";

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}
