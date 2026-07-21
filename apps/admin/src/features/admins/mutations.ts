"use client";

import {
  createAdmin,
  createAdminNote,
  deactivateAdmin,
  deleteAdminNote,
  reactivateAdmin,
  resetAdminPassword,
  revokeAdminSessions,
  updateAdmin,
  updateAdminNote,
} from "@/features/admins/api";
import type {
  CreateAdminInput,
  CreateAdminNoteInput,
  ResetAdminPasswordInput,
  UpdateAdminInput,
  UpdateAdminNoteInput,
} from "@/features/admins/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const adminInvalidateKeys = [queryKeys.admins.all()] as const;

export function useCreateAdmin() {
  return useApiMutation({
    mutationFn: (input: CreateAdminInput) => createAdmin(input),
    successMessage: "Admin created",
    invalidateKeys: [...adminInvalidateKeys],
  });
}

export function useUpdateAdmin() {
  return useApiMutation({
    mutationFn: ({
      adminId,
      input,
    }: {
      adminId: string;
      input: UpdateAdminInput;
    }) => updateAdmin(adminId, input),
    successMessage: "Admin updated",
    invalidateKeys: [...adminInvalidateKeys],
  });
}

export function useDeactivateAdmin() {
  return useApiMutation({
    mutationFn: (adminId: string) => deactivateAdmin(adminId),
    successMessage: "Admin deactivated",
    invalidateKeys: [...adminInvalidateKeys],
  });
}

export function useReactivateAdmin() {
  return useApiMutation({
    mutationFn: (adminId: string) => reactivateAdmin(adminId),
    successMessage: "Admin reactivated",
    invalidateKeys: [...adminInvalidateKeys],
  });
}

export function useResetAdminPassword() {
  return useApiMutation({
    mutationFn: ({
      adminId,
      input,
    }: {
      adminId: string;
      input: ResetAdminPasswordInput;
    }) => resetAdminPassword(adminId, input),
    successMessage: "Password reset",
    invalidateKeys: [...adminInvalidateKeys],
  });
}

export function useRevokeAdminSessions() {
  return useApiMutation({
    mutationFn: (adminId: string) => revokeAdminSessions(adminId),
    successMessage: "Sessions revoked",
    invalidateKeys: [...adminInvalidateKeys],
  });
}

export function useCreateAdminNote(adminId: string) {
  return useApiMutation({
    mutationFn: (input: CreateAdminNoteInput) =>
      createAdminNote(adminId, input),
    successMessage: "Note added",
    invalidateKeys: [queryKeys.admins.notes(adminId)],
  });
}

export function useUpdateAdminNote(adminId: string) {
  return useApiMutation({
    mutationFn: ({
      noteId,
      input,
    }: {
      noteId: string;
      input: UpdateAdminNoteInput;
    }) => updateAdminNote(noteId, input),
    successMessage: "Note updated",
    invalidateKeys: [queryKeys.admins.notes(adminId)],
  });
}

export function useDeleteAdminNote(adminId: string) {
  return useApiMutation({
    mutationFn: (noteId: string) => deleteAdminNote(noteId),
    successMessage: "Note deleted",
    invalidateKeys: [queryKeys.admins.notes(adminId)],
  });
}
