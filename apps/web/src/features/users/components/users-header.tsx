"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function UsersHeader() {
  const openCreateDialog = useUserUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Users
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage agency members, roles, and access
        </p>
      </div>
      {can("user.create") ? (
        <Button size="sm" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New user
        </Button>
      ) : null}
    </div>
  );
}
