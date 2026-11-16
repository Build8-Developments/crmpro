"use client";

import { useMemo } from "react";
import type { SettingsNavGroup } from "@/components/crm/settings-shell";
import { settingsNavGroups } from "@/config/routes";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Organization settings sections the current user may open, plus the first
 * one (used as the landing page and to decide whether to show the entry
 * point at all).
 */
export function useOrganizationSettingsNav() {
  const { canAccessRoute } = usePermissions();

  return useMemo(() => {
    const groups: SettingsNavGroup[] = settingsNavGroups.map((group) => ({
      label: group.label,
      items: group.routes.filter(canAccessRoute).map((route) => ({
        href: route.href,
        label: route.label,
        icon: route.icon,
        exact: route.href === "/settings",
      })),
    }));
    const firstHref =
      groups.flatMap((group) => group.items)[0]?.href ?? null;
    return { groups, firstHref, hasAccess: firstHref !== null };
  }, [canAccessRoute]);
}
