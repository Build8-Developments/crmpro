"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function RolesEmptyState() {
  const openCreateDialog = useRoleUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AppIcons.roles className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No roles found</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create custom roles to fine-tune access for your team members.
      </p>
      {can("role.manage") ? (
        <Button className="mt-6" onClick={openCreateDialog}>
          <AppIcons.create className="size-4" />
          New role
        </Button>
      ) : null}
    </div>
  );
}
