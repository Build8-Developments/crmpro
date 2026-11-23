"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DealStatusBadge } from "@/features/deals/components/deal-status-badge";
import type { Deal } from "@/features/deals/types";
import { formatDealDate } from "@/features/deals/utils/deal-format";
import { StageColorDot } from "@/features/leads/utils/stage-color";
import { formatMoney } from "@/lib/format";

/** Column ids double as the API sort field where `meta.sortable` is set. */
export const dealColumns: ColumnDef<Deal>[] = [
  {
    id: "lead",
    header: "Lead",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{row.original.lead.fullName}</p>
        <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <StageColorDot color={row.original.lead.stage.color} />
          {row.original.lead.stage.name}
        </p>
      </div>
    ),
  },
  {
    id: "unit",
    header: "Unit",
    cell: ({ row }) => {
      const deal = row.original;
      return (
        <div className="min-w-0">
          <p className="truncate">
            {deal.unitType}
            {deal.unitCode ? <span className="text-muted-foreground"> · {deal.unitCode}</span> : null}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{deal.project?.name ?? "—"}</p>
        </div>
      );
    },
  },
  {
    id: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatMoney(row.original.price, row.original.currency)}
      </span>
    ),
    meta: { sortable: true, align: "right" },
  },
  {
    id: "commission",
    header: "Commission",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.commissionAmount !== null
          ? formatMoney(row.original.commissionAmount, row.original.currency)
          : "—"}
      </span>
    ),
    meta: { align: "right", hideBelow: "lg" },
  },
  {
    id: "agent",
    header: "Agent",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.agent?.name ?? "—"}</span>
    ),
    meta: { hideBelow: "lg" },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <DealStatusBadge status={row.original.status} />,
  },
  {
    id: "reservedAt",
    header: "Reserved",
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDealDate(row.original.reservedAt)}
      </span>
    ),
    meta: { sortable: true },
  },
  {
    id: "contractedAt",
    header: "Contracted",
    cell: ({ row }) => {
      const deal = row.original;
      // A reserved deal shows when the contract is expected instead.
      if (deal.status === "RESERVED" && deal.expectedContractAt) {
        return (
          <span className="text-xs text-muted-foreground/80 tabular-nums">
            Expected {formatDealDate(deal.expectedContractAt)}
          </span>
        );
      }
      return (
        <span className="text-muted-foreground tabular-nums">
          {formatDealDate(deal.contractedAt)}
        </span>
      );
    },
    meta: { sortable: true, hideBelow: "xl" },
  },
];
