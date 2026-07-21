"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdmin, useAdmins } from "@/features/admins/hooks";
import {
  useDeactivateAdmin,
  useRevokeAdminSessions,
} from "@/features/admins/mutations";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

export function AdminConfirmDialogs() {
  const confirmAction = useAdminUiStore((s) => s.confirmAction);
  const confirmAdminId = useAdminUiStore((s) => s.confirmAdminId);
  const closeConfirmDialog = useAdminUiStore((s) => s.closeConfirmDialog);
  const { data: listData } = useAdmins();
  const { data: adminDetail } = useAdmin(confirmAdminId ?? undefined);
  const deactivateAdmin = useDeactivateAdmin();
  const revokeSessions = useRevokeAdminSessions();
  const { can } = usePermissions();

  const admin =
    adminDetail ?? listData?.items.find((item) => item.id === confirmAdminId);
  const open = Boolean(confirmAction && confirmAdminId && admin);

  if (!can(ADMIN_PERMISSIONS.ADMIN_MANAGE)) return null;

  const isDeactivate = confirmAction === "deactivate";
  const isPending = deactivateAdmin.isPending || revokeSessions.isPending;

  const handleConfirm = async () => {
    if (!confirmAdminId || !confirmAction) return;

    if (confirmAction === "deactivate") {
      await deactivateAdmin.mutateAsync(confirmAdminId);
    } else {
      await revokeSessions.mutateAsync(confirmAdminId);
    }
    closeConfirmDialog();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && closeConfirmDialog()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDeactivate ? "Deactivate admin" : "Revoke sessions"}
          </DialogTitle>
          <DialogDescription>
            {isDeactivate
              ? `Deactivate ${admin?.fullName}? They will lose access immediately.`
              : `Revoke all active sessions for ${admin?.fullName}? They will need to sign in again.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeConfirmDialog}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isDeactivate ? "destructive" : "default"}
            disabled={isPending}
            onClick={() => void handleConfirm()}
          >
            {isPending
              ? "Working..."
              : isDeactivate
                ? "Deactivate"
                : "Revoke sessions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
