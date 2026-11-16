"use client";

import type { ReactNode } from "react";
import { SettingsShell } from "@/components/crm/settings-shell";
import { useOrganizationSettingsNav } from "@/features/organization/hooks/use-organization-settings-nav";

export default function OrganizationSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { groups } = useOrganizationSettingsNav();

  return (
    <SettingsShell
      title="Organization settings"
      description="Applies to everyone in your workspace"
      groups={groups}
    >
      {children}
    </SettingsShell>
  );
}
