"use client";

import { Button } from "@/components/ui/button";
import type { AdminDetail } from "@/features/admins/types";
import { useReactivateAdmin } from "@/features/admins/mutations";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface AdminActionsProps {
  admin: AdminDetail;
}

export function AdminActions({ admin }: AdminActionsProps) {
  const currentAdminId = useAuthStore((s) => s.user?.id);
  const openEditDialog = useAdminUiStore((s) => s.openEditDialog);
  const openResetPasswordDialog = useAdminUiStore(
    (s) => s.openResetPasswordDialog,
  );
  const openConfirmDialog = useAdminUiStore((s) => s.openConfirmDialog);
  const reactivateAdmin = useReactivateAdmin();
  const { can } = usePermissions();

  if (!can(ADMIN_PERMISSIONS.ADMIN_MANAGE)) return null;

  const isSelf = currentAdminId === admin.id;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => openEditDialog(admin.id)}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => openResetPasswordDialog(admin.id)}
      >
        Reset password
      </Button>
      {!isSelf ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openConfirmDialog("revoke-sessions", admin.id)}
          >
            Revoke sessions
          </Button>
          {admin.isActive ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => openConfirmDialog("deactivate", admin.id)}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={reactivateAdmin.isPending}
              onClick={() => void reactivateAdmin.mutateAsync(admin.id)}
            >
              {reactivateAdmin.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          )}
        </>
      ) : null}
    </div>
  );
}
