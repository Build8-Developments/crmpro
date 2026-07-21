import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  ContractsListResponse,
  CreateTenantInput,
  CreateTenantResult,
  ResetTenantOwnerPasswordInput,
  TenantDetail,
  TenantsListParams,
  TenantsListResponse,
  TenantUsage,
  TenantUsersListParams,
  TenantUsersListResponse,
  TenantNoteItem,
  CreateTenantNoteInput,
  UpdateTenantNoteInput,
  UpdateTenantDetailsInput,
  UpdateTenantOwnerInput,
} from "./types";

export function getTenants(params?: TenantsListParams) {
  return apiClient.get<TenantsListResponse>("/tenants", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getTenantById(id: string) {
  return apiClient.get<TenantDetail>(`/tenants/${id}`);
}

export function getTenantUsage(id: string) {
  return apiClient.get<TenantUsage>(`/tenants/${id}/usage`);
}

export function getTenantUsers(id: string, params?: TenantUsersListParams) {
  return apiClient.get<TenantUsersListResponse>(`/tenants/${id}/users`, {
    query: serializeQueryParams({
      limit: 20,
      ...params,
    }),
  });
}

export function getTenantNotes(id: string) {
  return apiClient.get<TenantNoteItem[]>(`/tenants/${id}/notes`);
}

export function createTenantNote(id: string, input: CreateTenantNoteInput) {
  return apiClient.post<TenantNoteItem>(`/tenants/${id}/notes`, input);
}

export function updateTenantNote(noteId: string, input: UpdateTenantNoteInput) {
  return apiClient.patch<TenantNoteItem>(`/tenant-notes/${noteId}`, input);
}

export function deleteTenantNote(noteId: string) {
  return apiClient.delete<{ success: true }>(`/tenant-notes/${noteId}`);
}

export function createTenant(input: CreateTenantInput) {
  return apiClient.post<CreateTenantResult>("/tenants", input);
}

export function suspendTenant(id: string) {
  return apiClient.post<{ tenantId: string; status: string; revokedSessions: number }>(
    `/tenants/${id}/suspend`,
  );
}

export function reactivateTenant(id: string) {
  return apiClient.post<{ tenantId: string; status: string }>(
    `/tenants/${id}/reactivate`,
  );
}

export function updateTenantDetails(
  id: string,
  input: UpdateTenantDetailsInput,
) {
  return apiClient.patch<TenantDetail>(`/tenants/${id}/details`, input);
}

export function updateTenantOwner(id: string, input: UpdateTenantOwnerInput) {
  return apiClient.patch<TenantDetail>(`/tenants/${id}/owner`, input);
}

export function resetTenantOwnerPassword(
  id: string,
  input: ResetTenantOwnerPasswordInput,
) {
  return apiClient.post<{ id: string }>(
    `/tenants/${id}/reset-owner-password`,
    input,
  );
}

export function revokeTenantOwnerSessions(id: string) {
  return apiClient.post<{ revokedCount: number }>(
    `/tenants/${id}/revoke-owner-sessions`,
  );
}

/** ACTIVE contracts for the create-tenant form. */
export function getActiveContracts(params?: { page?: number; limit?: number }) {
  return apiClient.get<ContractsListResponse>("/contracts", {
    query: serializeQueryParams({
      status: "ACTIVE",
      limit: 100,
      ...params,
    }),
  });
}
