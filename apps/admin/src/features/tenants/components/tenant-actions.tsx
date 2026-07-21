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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useReactivateTenant,
  useResetTenantOwnerPassword,
  useRevokeTenantOwnerSessions,
  useSuspendTenant,
} from "@/features/tenants/mutations";
import {
  EditTenantDialog,
  EditTenantOwnerDialog,
} from "@/features/tenants/components/edit-tenant-dialogs";
import type { TenantDetail, TenantStatus } from "@/features/tenants/types";
import {
  isValidPassword,
  PASSWORD_HINT,
} from "@/features/tenants/utils/password";
import { usePermissions } from "@/hooks/use-permissions";

type ConfirmAction = "suspend" | "reactivate" | "revokeSessions" | null;

interface TenantActionsProps {
  tenant: TenantDetail;
}

export function TenantActions({ tenant }: TenantActionsProps) {
  const { can } = usePermissions();
  const suspendTenant = useSuspendTenant();
  const reactivateTenant = useReactivateTenant();
  const revokeSessions = useRevokeTenantOwnerSessions();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [editOwnerOpen, setEditOwnerOpen] = useState(false);

  const canUpdate = can(ADMIN_PERMISSIONS.TENANT_UPDATE);
  const canSuspend = can(ADMIN_PERMISSIONS.TENANT_SUSPEND);

  const canSuspendTenant =
    canSuspend &&
    (tenant.status === "ACTIVE" || tenant.status === "TRIAL");
  const canReactivateTenant =
    canSuspend && tenant.status === "SUSPENDED";

  if (!canUpdate && !canSuspend) {
    return null;
  }

  const isPending =
    suspendTenant.isPending ||
    reactivateTenant.isPending ||
    revokeSessions.isPending;

  const handleConfirm = async () => {
    if (!confirmAction) return;

    if (confirmAction === "suspend") {
      await suspendTenant.mutateAsync(tenant.id);
    } else if (confirmAction === "reactivate") {
      await reactivateTenant.mutateAsync(tenant.id);
    } else if (confirmAction === "revokeSessions") {
      await revokeSessions.mutateAsync(tenant.id);
    }

    setConfirmAction(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            aria-label={`Actions for ${tenant.name}`}
          >
            Actions
            <AppIcons.chevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {canUpdate ? (
            <>
              <DropdownMenuItem onClick={() => setEditTenantOpen(true)}>
                Edit tenant name
              </DropdownMenuItem>
              {tenant.ownerUser ? (
                <DropdownMenuItem onClick={() => setEditOwnerOpen(true)}>
                  Edit owner
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
            </>
          ) : null}
          {canSuspendTenant ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setConfirmAction("suspend")}
            >
              Suspend tenant
            </DropdownMenuItem>
          ) : null}
          {canReactivateTenant ? (
            <DropdownMenuItem onClick={() => setConfirmAction("reactivate")}>
              Reactivate tenant
            </DropdownMenuItem>
          ) : null}
          {canUpdate && tenant.ownerUser ? (
            <>
              {(canSuspendTenant || canReactivateTenant) && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem onClick={() => setResetPasswordOpen(true)}>
                Reset owner password
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmAction("revokeSessions")}
              >
                Revoke owner sessions
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmActionDialog
        action={confirmAction}
        tenantName={tenant.name}
        tenantStatus={tenant.status}
        pending={isPending}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => void handleConfirm()}
      />

      <ResetOwnerPasswordDialog
        open={resetPasswordOpen}
        tenantId={tenant.id}
        ownerName={tenant.ownerUser?.fullName ?? "owner"}
        onClose={() => setResetPasswordOpen(false)}
      />

      <EditTenantDialog
        tenant={tenant}
        open={editTenantOpen}
        onClose={() => setEditTenantOpen(false)}
      />

      <EditTenantOwnerDialog
        tenant={tenant}
        open={editOwnerOpen}
        onClose={() => setEditOwnerOpen(false)}
      />
    </>
  );
}

function ConfirmActionDialog({
  action,
  tenantName,
  tenantStatus,
  pending,
  onClose,
  onConfirm,
}: {
  action: ConfirmAction;
  tenantName: string;
  tenantStatus: TenantStatus;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const open = action !== null;

  const copy = (() => {
    switch (action) {
      case "suspend":
        return {
          title: "Suspend tenant?",
          description: `This will suspend ${tenantName} and revoke active owner sessions. Users will be unable to sign in until the tenant is reactivated.`,
          confirmLabel: "Suspend",
          destructive: true,
        };
      case "reactivate":
        return {
          title: "Reactivate tenant?",
          description: `Restore access for ${tenantName}. Current status is ${tenantStatus}.`,
          confirmLabel: "Reactivate",
          destructive: false,
        };
      case "revokeSessions":
        return {
          title: "Revoke owner sessions?",
          description: `All active sessions for the owner of ${tenantName} will be signed out immediately.`,
          confirmLabel: "Revoke sessions",
          destructive: true,
        };
      default:
        return {
          title: "",
          description: "",
          confirmLabel: "Confirm",
          destructive: false,
        };
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={copy.destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Working..." : copy.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetOwnerPasswordDialog({
  open,
  tenantId,
  ownerName,
  onClose,
}: {
  open: boolean;
  tenantId: string;
  ownerName: string;
  onClose: () => void;
}) {
  const resetPassword = useResetTenantOwnerPassword();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordValid = isValidPassword(password);
  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordValid || !passwordsMatch) return;

    await resetPassword.mutateAsync({
      tenantId,
      input: { newPassword: password },
    });
    setPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPassword("");
          setConfirmPassword("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset owner password</DialogTitle>
          <DialogDescription>
            Set a new password for {ownerName}. Active sessions remain until
            revoked separately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-owner-password">New password</Label>
            <Input
              id="reset-owner-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-owner-confirm">Confirm password</Label>
            <Input
              id="reset-owner-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            {confirmPassword && !passwordsMatch ? (
              <p className="text-xs text-destructive">
                Passwords do not match.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                resetPassword.isPending || !passwordValid || !passwordsMatch
              }
            >
              {resetPassword.isPending ? "Resetting..." : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
