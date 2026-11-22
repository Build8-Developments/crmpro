"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function LeadsEmptyState() {
  const openCreateDialog = useLeadUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <AppIcons.leads className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        No leads yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Import leads or create your first lead to start tracking your pipeline.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {can("import-job.create") ? (
          <Button variant="outline" size="sm" asChild>
            <Link href="/imports">
              <AppIcons.upload className="size-3.5" />
              Import CSV
            </Link>
          </Button>
        ) : null}
        {can("lead.create") ? (
          <Button size="sm" onClick={openCreateDialog}>
            <AppIcons.create className="size-3.5" />
            Add Lead
          </Button>
        ) : null}
      </div>
    </div>
  );
}
