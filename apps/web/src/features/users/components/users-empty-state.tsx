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
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <AppIcons.search className="mb-3 size-8 text-muted-foreground/60" />
        <h2 className="text-sm font-medium text-foreground">No matches</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AppIcons.users className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No users yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Invite team members and assign roles to start collaborating on leads.
      </p>
      {can("user.create") ? (
        <Button className="mt-6" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New user
        </Button>
      ) : null}
    </div>
  );
}
