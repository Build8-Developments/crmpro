"use client";

import type { ReactNode } from "react";
import { SettingsShell } from "@/components/crm/settings-shell";
import { accountSectionRoutes } from "@/config/routes";

const ACCOUNT_SECTIONS = [
  {
    items: accountSectionRoutes.map((route) => ({
      href: route.href,
      label: route.label,
      icon: route.icon,
      exact: route.href === "/account",
    })),
  },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsShell
      title="My account"
      description="Only you see and change these"
      groups={ACCOUNT_SECTIONS}
    >
      {children}
    </SettingsShell>
  );
}
