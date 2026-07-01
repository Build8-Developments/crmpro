"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { NavRoute } from "@/config/routes";

/**
 * Permission checks for UI gating.
 *
 * Permissions (not role names) drive access — roles are dynamic per tenant.
 */
export function usePermissions() {
  const permissions = useAuthStore((state) => state.permissions);
  const status = useAuthStore((state) => state.status);

  const can = useCallback(
    (permission: string) => {
      if (status !== "authenticated") {
        return false;
      }
      return permissions.has(permission);
    },
    [permissions, status],
  );

  const canAny = useCallback(
    (required: string[]) => required.some((permission) => can(permission)),
    [can],
  );

  const canAll = useCallback(
    (required: string[]) => required.every((permission) => can(permission)),
    [can],
  );

  const canAccessRoute = useCallback(
    (route: Pick<NavRoute, "requiredPermissions">) =>
      route.requiredPermissions.length === 0 ||
      canAll(route.requiredPermissions),
    [canAll],
  );

  return {
    can,
    canAny,
    canAll,
    canAccessRoute,
    /** @deprecated Use `can` */
    hasPermission: can,
    /** @deprecated Use `canAll` */
    hasAllPermissions: canAll,
  };
}
