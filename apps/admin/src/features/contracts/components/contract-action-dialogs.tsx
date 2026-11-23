"use client";

import { ADMIN_PERMISSIONS } from "@crmpro/shared";
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
  useActivateContract,
  useArchiveContract,
} from "@/features/contracts/mutations";
import type { ContractListItem } from "@/features/contracts/types";
import { usePermissions } from "@/hooks/use-permissions";

export { ContractTerminateDialog } from "@/features/contracts/components/contract-terminate-dialog";

function contractLabel(contract: ContractListItem | null) {
  return contract?.contractName?.trim() || "this contract";
}

interface ContractActionDialogProps {
  contract: ContractListItem | null;
  open: boolean;
  onClose: () => void;
  onArchived?: () => void;
}

export function ContractActivateDialog({
  contract,
  open,
  onClose,
}: ContractActionDialogProps) {
  const { can } = usePermissions();
  const activateContract = useActivateContract();

  const handleClose = () => {
    if (activateContract.isPending) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!contract) return;
    await activateContract.mutateAsync(contract.id);
    onClose();
  };

  if (!can(ADMIN_PERMISSIONS.CONTRACT_UPDATE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activate contract</DialogTitle>
          <DialogDescription>
            Activate &quot;{contractLabel(contract)}&quot;? This marks the
            agreement as active and syncs entitlements if a tenant is linked.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={activateContract.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={activateContract.isPending || !contract}
            onClick={() => void handleConfirm()}
          >
            {activateContract.isPending ? "Activating..." : "Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContractArchiveDialog({
  contract,
  open,
  onClose,
  onArchived,
}: ContractActionDialogProps) {
  const { can } = usePermissions();
  const archiveContract = useArchiveContract();

  const handleClose = () => {
    if (archiveContract.isPending) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!contract) return;
    await archiveContract.mutateAsync(contract.id);
    onClose();
    onArchived?.();
  };

  if (!can(ADMIN_PERMISSIONS.CONTRACT_UPDATE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive contract</DialogTitle>
          <DialogDescription>
            Archive &quot;{contractLabel(contract)}&quot;? Active contracts
            cannot be archived. This hides the agreement from the default list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={archiveContract.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={archiveContract.isPending || !contract}
            onClick={() => void handleConfirm()}
          >
            {archiveContract.isPending ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
