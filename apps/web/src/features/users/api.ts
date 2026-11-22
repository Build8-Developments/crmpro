import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateUserInput,
  InviteUserInput,
  ResetUserPasswordInput,
  RoleOption,
  UpdateUserInput,
  UpdateUserRoleInput,
  UserDetail,
  UserListItem,
  UsersListParams,
  UsersListResponse,
} from "./types";

export function getUsers(params?: UsersListParams) {
  return apiClient.get<UsersListResponse>("/users", {
    query: serializeQueryParams({
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
      ...params,
    }),
  });
}

export function getUserById(id: string) {
  return apiClient.get<UserDetail>(`/users/${id}`);
}

export function getRoles() {
  return apiClient.get<RoleOption[]>("/roles");
}

export function createUser(input: CreateUserInput) {
  return apiClient.post<UserListItem>("/users", input);
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiClient.patch<UserListItem>(`/users/${id}`, input);
}

export function updateUserRole(id: string, input: UpdateUserRoleInput) {
  return apiClient.patch<UserListItem>(`/users/${id}/role`, input);
}

export function deactivateUser(id: string) {
  return apiClient.post<UserListItem>(`/users/${id}/deactivate`);
}

export function reactivateUser(id: string) {
  return apiClient.post<UserListItem>(`/users/${id}/reactivate`);
}

export function resetUserPassword(id: string, input: ResetUserPasswordInput) {
  return apiClient.post<{ id: string }>(`/users/${id}/reset-password`, input);
}

export function revokeUserSessions(id: string) {
  return apiClient.post<{ revokedCount: number }>(`/users/${id}/revoke-sessions`);
}

export function checkEmail(email: string) {
  return apiClient.get<{ available: boolean }>("/users/check-email", {
    query: { email },
  });
}

export function getUserQuota() {
  return apiClient.get<{ maxUsers: number | null; currentUsers: number }>("/users/quota");
}

export function inviteUser(input: InviteUserInput) {
  return apiClient.post<UserListItem>("/users/invite", input);
}

export function resendInvite(userId: string) {
  return apiClient.post<{ id: string }>(`/users/${userId}/resend-invite`);
}
