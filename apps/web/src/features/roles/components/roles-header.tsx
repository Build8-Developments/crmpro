"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function RolesHeader() {
  const openCreateDialog = useRoleUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Roles
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Control what each team role can access
        </p>
      </div>
      {can("role.manage") ? (
        <Button size="sm" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New role
        </Button>
      ) : null}
    </div>
  );
}
