"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface AdminsEmptyStateProps {
  hasFilters: boolean;
}

export function AdminsEmptyState({ hasFilters }: AdminsEmptyStateProps) {
  const openCreateDialog = useAdminUiStore((s) => s.openCreateDialog);
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
        <AppIcons.users className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        No admins yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create platform staff accounts and assign roles to operate CRMPro Admin.
      </p>
      {can(ADMIN_PERMISSIONS.ADMIN_MANAGE) ? (
        <Button size="sm" className="mt-4" onClick={openCreateDialog}>
          <AppIcons.create className="size-3.5" />
          New admin
        </Button>
      ) : null}
    </div>
  );
}
