"use client";

import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

interface PlansEmptyStateProps {
  hasFilters: boolean;
  onCreate?: () => void;
}

export function PlansEmptyState({ hasFilters, onCreate }: PlansEmptyStateProps) {
  const { can } = usePermissions();

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
        <AppIcons.chartBar className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        No plans yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create subscription plan templates with pricing, limits, and features.
      </p>
      {can(ADMIN_PERMISSIONS.PLAN_CREATE) && onCreate ? (
        <Button size="sm" className="mt-4" onClick={onCreate}>
          <AppIcons.create className="size-3.5" />
          New plan
        </Button>
      ) : null}
    </div>
  );
}
