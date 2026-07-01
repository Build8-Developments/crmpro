"use client";

import {
  archiveRole,
  createRole,
  updateRole,
  updateRolePermissions,
} from "@/features/roles/api";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "@/features/roles/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const roleInvalidateKeys = [
  queryKeys.roles.all(),
  queryKeys.users.all(),
  queryKeys.auth.permissions(),
] as const;

export function useCreateRole() {
  return useApiMutation({
    mutationFn: (input: CreateRoleInput) => createRole(input),
    successMessage: "Role created",
    invalidateKeys: [...roleInvalidateKeys],
  });
}

export function useUpdateRole() {
  return useApiMutation({
    mutationFn: ({
      roleId,
      input,
    }: {
      roleId: string;
      input: UpdateRoleInput;
    }) => updateRole(roleId, input),
    successMessage: "Role updated",
    invalidateKeys: [...roleInvalidateKeys],
  });
}

export function useUpdateRolePermissions() {
  return useApiMutation({
    mutationFn: ({
      roleId,
      input,
    }: {
      roleId: string;
      input: UpdateRolePermissionsInput;
    }) => updateRolePermissions(roleId, input),
    successMessage: "Permissions updated",
    invalidateKeys: [...roleInvalidateKeys],
  });
}

export function useArchiveRole() {
  return useApiMutation({
    mutationFn: (roleId: string) => archiveRole(roleId),
    successMessage: "Role archived",
    invalidateKeys: [...roleInvalidateKeys],
  });
}
