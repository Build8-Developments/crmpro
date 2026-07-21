"use client";

import Link from "next/link";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContractListItem } from "@/features/contracts/types";
import { usePermissions } from "@/hooks/use-permissions";

interface ContractRowActionsProps {
  contract: ContractListItem;
  onEdit: (contract: ContractListItem) => void;
  onActivate: (contract: ContractListItem) => void;
  onTerminate: (contract: ContractListItem) => void;
  onArchive: (contract: ContractListItem) => void;
}

export function ContractRowActions({
  contract,
  onEdit,
  onActivate,
  onTerminate,
  onArchive,
}: ContractRowActionsProps) {
  const { can } = usePermissions();
  const canUpdate = can(ADMIN_PERMISSIONS.CONTRACT_UPDATE);
  const canTerminate = can(ADMIN_PERMISSIONS.CONTRACT_TERMINATE);
  const canActivate = canUpdate && contract.status === "DRAFT";
  const canTerminateAction =
    canTerminate &&
    (contract.status === "ACTIVE" || contract.status === "EXPIRED");
  const canArchiveAction =
    canUpdate &&
    (contract.status === "DRAFT" ||
      contract.status === "TERMINATED" ||
      contract.status === "EXPIRED");
  const canEdit = canUpdate && contract.status === "DRAFT";

  if (!canUpdate && !canTerminate && !can(ADMIN_PERMISSIONS.CONTRACT_READ)) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Actions for ${contract.contractName ?? "contract"}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/contracts/${contract.id}`}>View details</Link>
        </DropdownMenuItem>
        {canEdit ? (
          <DropdownMenuItem onClick={() => onEdit(contract)}>
            Edit contract
          </DropdownMenuItem>
        ) : null}
        {canActivate || canTerminateAction || canArchiveAction ? (
          <DropdownMenuSeparator />
        ) : null}
        {canActivate ? (
          <DropdownMenuItem onClick={() => onActivate(contract)}>
            Activate
          </DropdownMenuItem>
        ) : null}
        {canTerminateAction ? (
          <DropdownMenuItem onClick={() => onTerminate(contract)}>
            Terminate
          </DropdownMenuItem>
        ) : null}
        {canArchiveAction ? (
          <DropdownMenuItem onClick={() => onArchive(contract)}>
            Archive
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
