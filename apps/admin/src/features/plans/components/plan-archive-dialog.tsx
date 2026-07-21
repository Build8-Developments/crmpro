"use client";

import { useState } from "react";
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
import { useArchivePlan } from "@/features/plans/mutations";
import type { PlanListItem } from "@/features/plans/types";
import { usePermissions } from "@/hooks/use-permissions";

interface PlanArchiveDialogProps {
  plan: PlanListItem | null;
  open: boolean;
  onClose: () => void;
}

export function PlanArchiveDialog({
  plan,
  open,
  onClose,
}: PlanArchiveDialogProps) {
  const { can } = usePermissions();
  const archivePlan = useArchivePlan();
  const [confirming, setConfirming] = useState(false);

  const handleClose = () => {
    if (archivePlan.isPending) return;
    setConfirming(false);
    onClose();
  };

  const handleArchive = async () => {
    if (!plan) return;
    setConfirming(true);
    try {
      await archivePlan.mutateAsync(plan.id);
      handleClose();
    } finally {
      setConfirming(false);
    }
  };

  if (!can(ADMIN_PERMISSIONS.PLAN_UPDATE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive plan</DialogTitle>
          <DialogDescription>
            Archive &quot;{plan?.name}&quot;? Existing contracts keep their
            current plan snapshot, but this template can no longer be selected
            for new contracts.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={archivePlan.isPending || confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={archivePlan.isPending || confirming || !plan}
            onClick={() => void handleArchive()}
          >
            {archivePlan.isPending || confirming ? "Archiving..." : "Archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
