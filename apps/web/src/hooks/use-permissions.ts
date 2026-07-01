"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import type { NavRoute } from "@/config/routes";

/**
 * Permission checks for UI gating.
 *
 * Permissions (not role names) drive access — roles are dynamic per tenant.
 *
 * Phase 1 note: there is no real session yet. When no user is loaded we treat
 * everything as accessible so the shell and placeholder pages remain navigable.
 * TODO(phase-2): remove the "no user = allow" fallback once auth is wired.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return true; // scaffolding fallback
      return user.permissions.includes(permission);
    },
    [user],
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]) => permissions.every(hasPermission),
    [hasPermission],
  );

  const canAccessRoute = useCallback(
    (route: Pick<NavRoute, "requiredPermissions">) =>
      route.requiredPermissions.length === 0 ||
      hasAllPermissions(route.requiredPermissions),
    [hasAllPermissions],
  );

  return { hasPermission, hasAllPermissions, canAccessRoute };
}
