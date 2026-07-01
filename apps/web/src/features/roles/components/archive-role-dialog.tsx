"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole, useRoles } from "@/features/roles/hooks";
import { useArchiveRole } from "@/features/roles/mutations";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import { formatNumber } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";

export function ArchiveRoleDialog() {
  const archiveRoleId = useRoleUiStore((s) => s.archiveRoleId);
  const closeArchiveDialog = useRoleUiStore((s) => s.closeArchiveDialog);
  const setSelectedRoleId = useRoleUiStore((s) => s.setSelectedRoleId);
  const { data: roles } = useRoles();
  const { data: roleDetail } = useRole(archiveRoleId ?? undefined);
  const archiveRole = useArchiveRole();
  const { can } = usePermissions();
  const [confirmName, setConfirmName] = useState("");

  const role =
    roleDetail ?? roles?.find((item) => item.id === archiveRoleId);
  const open = Boolean(archiveRoleId && role && !role.isSystem);
  const hasUsers = (role?.userCount ?? 0) > 0;

  const handleClose = () => {
    closeArchiveDialog();
    setConfirmName("");
  };

  const handleArchive = async () => {
    if (!archiveRoleId || !role || hasUsers) return;

    await archiveRole.mutateAsync(archiveRoleId);

    const remaining = roles?.filter((item) => item.id !== archiveRoleId);
    setSelectedRoleId(remaining?.[0]?.id ?? null);
    handleClose();
  };

  if (!can("role.manage")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive role</DialogTitle>
          <DialogDescription>
            {hasUsers ? (
              <>
                &quot;{role?.name}&quot; is assigned to{" "}
                {formatNumber(role?.userCount ?? 0)} user
                {(role?.userCount ?? 0) === 1 ? "" : "s"}. Reassign them
                before archiving this role.
              </>
            ) : (
              <>
                This archives &quot;{role?.name}&quot;. Archived roles cannot
                be assigned to new users.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!hasUsers ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-role-name">
              Type <span className="font-medium">{role?.name}</span> to confirm
            </Label>
            <Input
              id="confirm-role-name"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder={role?.name}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {hasUsers ? "Close" : "Cancel"}
          </Button>
          {!hasUsers ? (
            <Button
              type="button"
              variant="destructive"
              disabled={
                archiveRole.isPending || confirmName.trim() !== role?.name
              }
              onClick={() => void handleArchive()}
            >
              {archiveRole.isPending ? "Archiving..." : "Archive role"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
