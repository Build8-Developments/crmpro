"use client";

import { AppIcons } from "@/components/icons/app-icons";

interface AuditEmptyStateProps {
  hasFilters: boolean;
}

export function AuditEmptyState({ hasFilters }: AuditEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <AppIcons.audit className="size-10 text-muted-foreground/40" />
      <h3 className="mt-4 text-sm font-medium text-foreground">
        {hasFilters ? "No events match your filters" : "No audit events yet"}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {hasFilters
          ? "Try widening your date range or clearing filters."
          : "User, role, and file activity will appear here as your team works."}
      </p>
    </div>
  );
}
