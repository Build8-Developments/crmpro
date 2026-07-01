import { apiClient } from "@/lib/api/client";
import type {
  CreateRoleInput,
  Role,
  RoleDetail,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "./types";

export function getRoles() {
  return apiClient.get<Role[]>("/roles");
}

export function getRoleById(id: string) {
  return apiClient.get<RoleDetail>(`/roles/${id}`);
}

export function createRole(input: CreateRoleInput) {
  return apiClient.post<RoleDetail>("/roles", input);
}

export function updateRole(id: string, input: UpdateRoleInput) {
  return apiClient.patch<RoleDetail>(`/roles/${id}`, input);
}

export function updateRolePermissions(
  id: string,
  input: UpdateRolePermissionsInput,
) {
  return apiClient.patch<RoleDetail>(`/roles/${id}/permissions`, input);
}

export function archiveRole(id: string) {
  return apiClient.post<{ success: true }>(`/roles/${id}/archive`);
}
