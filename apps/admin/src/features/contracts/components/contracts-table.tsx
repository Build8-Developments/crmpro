"use client";

import Link from "next/link";
import { ContractRowActions } from "@/features/contracts/components/contract-row-actions";
import { ContractStatusBadge } from "@/features/contracts/components/contract-status-badge";
import type { ContractListItem } from "@/features/contracts/types";
import {
  PAYMENT_FREQUENCY_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/features/contracts/types";
import { formatDate, formatMoney } from "@/lib/format";

interface ContractsTableProps {
  contracts: ContractListItem[];
  onEdit: (contract: ContractListItem) => void;
  onActivate: (contract: ContractListItem) => void;
  onTerminate: (contract: ContractListItem) => void;
  onArchive: (contract: ContractListItem) => void;
}

export function ContractsTable({
  contracts,
  onEdit,
  onActivate,
  onTerminate,
  onArchive,
}: ContractsTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Contract
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Plan
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Price
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase md:table-cell">
              Payment
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
              Term
            </th>
            <th className="h-8 w-10 px-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr
              key={contract.id}
              className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/contracts/${contract.id}`}
                  className="block min-w-0 text-left"
                >
                  <span className="truncate text-sm font-medium text-foreground">
                    {contract.contractName?.trim() || "Untitled contract"}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {PAYMENT_FREQUENCY_LABELS[contract.paymentFrequency]}
                    {contract.autoRenew ? " · Auto-renew" : ""}
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {contract.planName}
              </td>
              <td className="px-3 py-2">
                <ContractStatusBadge status={contract.status} />
              </td>
              <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                {formatMoney(contract.agreedPrice, contract.currency)}
              </td>
              <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                {PAYMENT_METHOD_LABELS[contract.paymentMethod]}
              </td>
              <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">
                {formatDate(contract.contractStartAt)}
                {contract.contractEndAt
                  ? ` – ${formatDate(contract.contractEndAt)}`
                  : " – Open"}
              </td>
              <td className="px-2 py-2 text-right">
                <ContractRowActions
                  contract={contract}
                  onEdit={onEdit}
                  onActivate={onActivate}
                  onTerminate={onTerminate}
                  onArchive={onArchive}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
