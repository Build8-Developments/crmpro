"use client";

import {
  createUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  revokeUserSessions,
  updateUser,
  updateUserRole,
} from "@/features/users/api";
import type {
  CreateUserInput,
  ResetUserPasswordInput,
  UpdateUserInput,
  UpdateUserRoleInput,
} from "@/features/users/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const userInvalidateKeys = [
  queryKeys.users.all(),
  queryKeys.dashboard.all(),
  ["leads", "filter-options", "users"] as const,
] as const;

export function useCreateUser() {
  return useApiMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    successMessage: "User created",
    invalidateKeys: [...userInvalidateKeys],
  });
}

export function useUpdateUser() {
  return useApiMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserInput;
    }) => updateUser(userId, input),
    successMessage: "User updated",
    invalidateKeys: [...userInvalidateKeys],
  });
}

export function useUpdateUserRole() {
  return useApiMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateUserRoleInput;
    }) => updateUserRole(userId, input),
    successMessage: "Role updated",
    invalidateKeys: [...userInvalidateKeys, queryKeys.roles.all()],
  });
}

export function useDeactivateUser() {
  return useApiMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    successMessage: "User deactivated",
    invalidateKeys: [...userInvalidateKeys],
  });
}

export function useReactivateUser() {
  return useApiMutation({
    mutationFn: (userId: string) => reactivateUser(userId),
    successMessage: "User reactivated",
    invalidateKeys: [...userInvalidateKeys],
  });
}

export function useResetUserPassword() {
  return useApiMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: ResetUserPasswordInput;
    }) => resetUserPassword(userId, input),
    successMessage: "Password reset",
    invalidateKeys: [...userInvalidateKeys],
  });
}

export function useRevokeUserSessions() {
  return useApiMutation({
    mutationFn: (userId: string) => revokeUserSessions(userId),
    successMessage: "Sessions revoked",
    invalidateKeys: [...userInvalidateKeys],
  });
}
