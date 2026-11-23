"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { getRoute } from "@/config/routes";
import { usePermissions } from "@/hooks/use-permissions";
import { formatReadOnlyUntil } from "@/lib/api/tenant-read-only";
import { useAuthStore } from "@/stores/auth-store";

const EXPORTS_PATH = "/exports";

/**
 * Shown across the app while the workspace's contract ended in read-only
 * mode: everything can be viewed and exported, nothing can be changed.
 * The state comes from /auth/me and from any TENANT_READ_ONLY error.
 */
export function ReadOnlyBanner() {
  const access = useAuthStore((state) => state.user?.tenant.access);
  const { canAccessRoute } = usePermissions();

  if (!access?.readOnly) {
    return null;
  }

  const until = formatReadOnlyUntil(access.accessEndsAt);
  const exportsRoute = getRoute(EXPORTS_PATH);
  const canExport = exportsRoute ? canAccessRoute(exportsRoute) : false;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground"
    >
      <AppIcons.lock
        className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden
      />
      <p className="min-w-0 flex-1">
        <span className="font-medium">
          This workspace is read-only{until ? ` until ${until}` : ""}.
        </span>{" "}
        <span className="text-muted-foreground">
          Its contract ended. You can still view and export your data; changes
          are turned off.
        </span>
      </p>
      {canExport ? (
        <Link
          href={EXPORTS_PATH}
          className="shrink-0 font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          Export your data
        </Link>
      ) : null}
    </div>
  );
}
