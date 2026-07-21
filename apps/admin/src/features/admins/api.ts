import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  AdminDetail,
  AdminNoteItem,
  AdminRoleDetail,
  AdminRoleSummary,
  AdminsListParams,
  AdminsListResponse,
  CreateAdminInput,
  CreateAdminNoteInput,
  ResetAdminPasswordInput,
  UpdateAdminInput,
  UpdateAdminNoteInput,
} from "./types";

export function getAdmins(params?: AdminsListParams) {
  return apiClient.get<AdminsListResponse>("/admins", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getAdminById(id: string) {
  return apiClient.get<AdminDetail>(`/admins/${id}`);
}

export function getAdminRoles() {
  return apiClient.get<AdminRoleSummary[]>("/admins/roles");
}

export function getAdminRoleById(id: string) {
  return apiClient.get<AdminRoleDetail>(`/admins/roles/${id}`);
}

export function createAdmin(input: CreateAdminInput) {
  return apiClient.post<AdminDetail>("/admins", input);
}

export function updateAdmin(id: string, input: UpdateAdminInput) {
  return apiClient.patch<AdminDetail>(`/admins/${id}`, input);
}

export function deactivateAdmin(id: string) {
  return apiClient.post<AdminDetail>(`/admins/${id}/deactivate`);
}

export function reactivateAdmin(id: string) {
  return apiClient.post<AdminDetail>(`/admins/${id}/reactivate`);
}

export function revokeAdminSessions(id: string) {
  return apiClient.post<{ revokedCount: number }>(
    `/admins/${id}/revoke-sessions`,
  );
}

export function resetAdminPassword(id: string, input: ResetAdminPasswordInput) {
  return apiClient.post<{ success: true }>(
    `/admins/${id}/reset-password`,
    input,
  );
}

export function getAdminNotes(adminId: string) {
  return apiClient.get<AdminNoteItem[]>(`/admins/${adminId}/notes`);
}

export function createAdminNote(adminId: string, input: CreateAdminNoteInput) {
  return apiClient.post<AdminNoteItem>(`/admins/${adminId}/notes`, input);
}

export function updateAdminNote(noteId: string, input: UpdateAdminNoteInput) {
  return apiClient.patch<AdminNoteItem>(`/admin-notes/${noteId}`, input);
}

export function deleteAdminNote(noteId: string) {
  return apiClient.delete<{ success: true }>(`/admin-notes/${noteId}`);
}
