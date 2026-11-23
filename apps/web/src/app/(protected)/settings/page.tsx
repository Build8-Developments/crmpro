"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganizationSettingsNav } from "@/features/organization/hooks/use-organization-settings-nav";
import { GeneralSettingsPage } from "@/features/organization/components/general-settings-page";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsGeneralRoute() {
  const { can } = usePermissions();
  const isReady = useAuthStore((state) => state.status) === "authenticated";
  const { firstHref } = useOrganizationSettingsNav();
  const router = useRouter();
  const canRead = can("settings.read");

  // Members without settings.read can still reach sections like Pipelines.
  useEffect(() => {
    if (isReady && !canRead && firstHref && firstHref !== "/settings") {
      router.replace(firstHref);
    }
  }, [isReady, canRead, firstHref, router]);

  if (!canRead) return null;
  return <GeneralSettingsPage />;
}
