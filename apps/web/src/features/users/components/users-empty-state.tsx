"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

interface UsersEmptyStateProps {
  hasFilters: boolean;
}

export function UsersEmptyState({ hasFilters }: UsersEmptyStateProps) {
  const openCreateDialog = useUserUiStore((s) => s.openCreateDialog);
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
        No users yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Invite team members and assign roles to start collaborating on leads.
      </p>
      {can("user.create") ? (
        <Button size="sm" className="mt-4" onClick={openCreateDialog}>
          <AppIcons.create className="size-3.5" />
          New user
        </Button>
      ) : null}
    </div>
  );
}
