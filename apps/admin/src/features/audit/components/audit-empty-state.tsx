"use client";

import { AppIcons } from "@/components/icons/app-icons";
import type { AuditTab } from "@/features/audit/types";

interface AuditEmptyStateProps {
  hasFilters: boolean;
  tab: AuditTab;
}

export function AuditEmptyState({ hasFilters, tab }: AuditEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <AppIcons.search className="size-5 text-muted-foreground/50" />
        <h2 className="mt-3 text-sm font-medium text-foreground">No matches</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <AppIcons.audit className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        {tab === "audit" ? "No audit logs yet" : "No security events yet"}
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {tab === "audit"
          ? "Administrative actions will appear here as staff operate the platform."
          : "Authentication and security signals will appear here as they occur."}
      </p>
    </div>
  );
}
