"use client";

import Link from "next/link";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

interface TenantsEmptyStateProps {
  hasFilters: boolean;
}

export function TenantsEmptyState({ hasFilters }: TenantsEmptyStateProps) {
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
        <AppIcons.building className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        No tenants yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Provision an agency workspace from an active contract to get started.
      </p>
      {can(ADMIN_PERMISSIONS.TENANT_CREATE) ? (
        <Button size="sm" className="mt-4" asChild>
          <Link href="/tenants/new">
            <AppIcons.create className="size-3.5" />
            New tenant
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
