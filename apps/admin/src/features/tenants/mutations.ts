"use client";

import {
  createTenant,
  createTenantNote,
  deleteTenantNote,
  reactivateTenant,
  resetTenantOwnerPassword,
  revokeTenantOwnerSessions,
  suspendTenant,
  updateTenantDetails,
  updateTenantNote,
  updateTenantOwner,
} from "@/features/tenants/api";
import type {
  CreateTenantInput,
  CreateTenantNoteInput,
  ResetTenantOwnerPasswordInput,
  UpdateTenantDetailsInput,
  UpdateTenantNoteInput,
  UpdateTenantOwnerInput,
} from "@/features/tenants/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const tenantInvalidateKeys = [
  queryKeys.tenants.all(),
  queryKeys.dashboard.all(),
] as const;

export function useCreateTenant() {
  return useApiMutation({
    mutationFn: (input: CreateTenantInput) => createTenant(input),
    successMessage: "Tenant created",
    invalidateKeys: [
      ...tenantInvalidateKeys,
      queryKeys.contracts.all(),
    ],
  });
}

export function useSuspendTenant() {
  return useApiMutation({
    mutationFn: (tenantId: string) => suspendTenant(tenantId),
    successMessage: "Tenant suspended",
    invalidateKeys: [...tenantInvalidateKeys],
  });
}

export function useReactivateTenant() {
  return useApiMutation({
    mutationFn: (tenantId: string) => reactivateTenant(tenantId),
    successMessage: "Tenant reactivated",
    invalidateKeys: [...tenantInvalidateKeys],
  });
}

export function useUpdateTenantDetails() {
  return useApiMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: UpdateTenantDetailsInput;
    }) => updateTenantDetails(tenantId, input),
    successMessage: "Tenant updated",
    invalidateKeys: [...tenantInvalidateKeys],
  });
}

export function useUpdateTenantOwner() {
  return useApiMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: UpdateTenantOwnerInput;
    }) => updateTenantOwner(tenantId, input),
    successMessage: "Owner updated",
    invalidateKeys: [...tenantInvalidateKeys],
  });
}

export function useResetTenantOwnerPassword() {
  return useApiMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: ResetTenantOwnerPasswordInput;
    }) => resetTenantOwnerPassword(tenantId, input),
    successMessage: "Owner password reset",
    invalidateKeys: [...tenantInvalidateKeys],
  });
}

export function useRevokeTenantOwnerSessions() {
  return useApiMutation({
    mutationFn: (tenantId: string) => revokeTenantOwnerSessions(tenantId),
    successMessage: "Owner sessions revoked",
    invalidateKeys: [...tenantInvalidateKeys],
  });
}

export function useCreateTenantNote(tenantId: string) {
  return useApiMutation({
    mutationFn: (input: CreateTenantNoteInput) =>
      createTenantNote(tenantId, input),
    successMessage: "Support note added",
    invalidateKeys: [
      queryKeys.tenants.notes(tenantId),
      queryKeys.audit.all(),
    ],
  });
}

export function useUpdateTenantNote(tenantId: string) {
  return useApiMutation({
    mutationFn: ({
      noteId,
      input,
    }: {
      noteId: string;
      input: UpdateTenantNoteInput;
    }) => updateTenantNote(noteId, input),
    successMessage: "Support note updated",
    invalidateKeys: [queryKeys.tenants.notes(tenantId)],
  });
}

export function useDeleteTenantNote(tenantId: string) {
  return useApiMutation({
    mutationFn: (noteId: string) => deleteTenantNote(noteId),
    successMessage: "Support note deleted",
    invalidateKeys: [queryKeys.tenants.notes(tenantId)],
  });
}
