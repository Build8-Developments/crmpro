"use client";

import { useState } from "react";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { computeTerminationAccessEndsAt } from "@crmpro/shared/billing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTerminateContract } from "@/features/contracts/mutations";
import {
  CONTRACT_TERMINATION_MODES,
  TERMINATION_MODE_LABELS,
  type ContractListItem,
  type ContractTerminationMode,
} from "@/features/contracts/types";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

/** Access ends at the end of a UTC day; show that day. */
const accessDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MODE_EXPLANATIONS: Record<ContractTerminationMode, string> = {
  FULL_ACCESS:
    "The workspace keeps working normally until the contract end plus grace days, then it is locked.",
  READ_ONLY:
    "Users can sign in, view and export their data until the same date, but cannot change anything.",
  IMMEDIATE:
    "The tenant is suspended now and every user is signed out. Grace days are ignored.",
};

function contractLabel(contract: ContractListItem | null) {
  return contract?.contractName?.trim() || "this contract";
}

/** "Read-only until 12 Jan 2027", "Suspended now", … */
function outcomeLabel(
  mode: ContractTerminationMode,
  contract: ContractListItem,
  now: number,
): string {
  if (mode === "IMMEDIATE") {
    return contract.tenantId
      ? "Suspended now"
      : "Ends now (no tenant linked)";
  }

  const until = accessDateFormatter.format(
    computeTerminationAccessEndsAt(
      mode,
      {
        contractEndAt: contract.contractEndAt,
        gracePeriodDays: contract.gracePeriodDays,
      },
      new Date(now),
    ),
  );
  return mode === "READ_ONLY"
    ? `Read-only until ${until}`
    : `Full access until ${until}`;
}

interface ContractTerminateDialogProps {
  contract: ContractListItem | null;
  open: boolean;
  onClose: () => void;
}

export function ContractTerminateDialog({
  contract,
  open,
  onClose,
}: ContractTerminateDialogProps) {
  const { can } = usePermissions();
  const terminateContract = useTerminateContract();

  const handleClose = () => {
    if (terminateContract.isPending) return;
    onClose();
  };

  if (!can(ADMIN_PERMISSIONS.CONTRACT_TERMINATE)) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        {open && contract ? (
          <TerminateForm
            contract={contract}
            pending={terminateContract.isPending}
            onCancel={handleClose}
            onConfirm={async (input) => {
              await terminateContract.mutateAsync({
                contractId: contract.id,
                input,
              });
              onClose();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted when the dialog opens, so "now" is the moment it was opened. */
function TerminateForm({
  contract,
  pending,
  onCancel,
  onConfirm,
}: {
  contract: ContractListItem;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (input: {
    mode: ContractTerminationMode;
    reason?: string;
  }) => Promise<void>;
}) {
  const [openedAt] = useState(() => Date.now());
  const [mode, setMode] = useState<ContractTerminationMode | null>(null);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!mode) return;
    await onConfirm({ mode, reason: reason.trim() || undefined });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Terminate contract</DialogTitle>
        <DialogDescription>
          Terminate &quot;{contractLabel(contract)}&quot;? Choose what the
          workspace keeps until access ends. This cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Access after termination</legend>
        {CONTRACT_TERMINATION_MODES.map((option) => {
          const selected = mode === option;
          return (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors",
                selected
                  ? option === "IMMEDIATE"
                    ? "border-destructive/60 bg-destructive/5"
                    : "border-primary/60 bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="termination-mode"
                value={option}
                checked={selected}
                onChange={() => setMode(option)}
                disabled={pending}
                className="mt-0.5 size-4 accent-primary"
              />
              <span className="min-w-0 space-y-0.5">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium text-foreground">
                    {TERMINATION_MODE_LABELS[option]}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {outcomeLabel(option, contract, openedAt)}
                  </span>
                </span>
                <span className="block text-muted-foreground">
                  {MODE_EXPLANATIONS[option]}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="termination-reason">Reason (optional)</Label>
        <textarea
          id="termination-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={1000}
          rows={2}
          disabled={pending}
          placeholder="Kept in the audit log"
          className="flex min-h-[56px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30"
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending || !mode}
          onClick={() => void handleConfirm()}
        >
          {pending
            ? "Terminating..."
            : mode
              ? `Terminate · ${outcomeLabel(mode, contract, openedAt)}`
              : "Terminate"}
        </Button>
      </DialogFooter>
    </>
  );
}
