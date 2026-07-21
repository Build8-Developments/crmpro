"use client";

import { useState } from "react";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useReactivateTenant,
  useSuspendTenant,
} from "@/features/tenants/mutations";
import type { TenantListItem, TenantStatus } from "@/features/tenants/types";
import { usePermissions } from "@/hooks/use-permissions";

type ConfirmAction = "suspend" | "reactivate" | null;

interface TenantRowActionsProps {
  tenant: TenantListItem;
}

export function TenantRowActions({ tenant }: TenantRowActionsProps) {
  const { can } = usePermissions();
  const suspendTenant = useSuspendTenant();
  const reactivateTenant = useReactivateTenant();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const canSuspend = can(ADMIN_PERMISSIONS.TENANT_SUSPEND);
  const canSuspendTenant =
    canSuspend &&
    (tenant.status === "ACTIVE" || tenant.status === "TRIAL");
  const canReactivateTenant =
    canSuspend && tenant.status === "SUSPENDED";

  if (!canSuspendTenant && !canReactivateTenant) {
    return null;
  }

  const isPending = suspendTenant.isPending || reactivateTenant.isPending;

  const handleConfirm = async () => {
    if (!confirmAction) return;
    if (confirmAction === "suspend") {
      await suspendTenant.mutateAsync(tenant.id);
    } else {
      await reactivateTenant.mutateAsync(tenant.id);
    }
    setConfirmAction(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label={`Actions for ${tenant.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <AppIcons.moreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {canSuspendTenant ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                setConfirmAction("suspend");
              }}
            >
              Suspend
            </DropdownMenuItem>
          ) : null}
          {canReactivateTenant ? (
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                setConfirmAction("reactivate");
              }}
            >
              Reactivate
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <DialogContent
          className="sm:max-w-md"
          onClick={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "suspend"
                ? "Suspend tenant?"
                : "Reactivate tenant?"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "suspend"
                ? `${tenant.name} will lose access until reactivated.`
                : `Restore access for ${tenant.name} (currently ${tenant.status as TenantStatus}).`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmAction === "suspend" ? "destructive" : "default"}
              disabled={isPending}
              onClick={() => void handleConfirm()}
            >
              {isPending
                ? "Working..."
                : confirmAction === "suspend"
                  ? "Suspend"
                  : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
