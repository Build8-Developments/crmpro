"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import {
  formatRate,
  NO_SOURCE_LINK_HINT,
  sourceLeadsHref,
  type SourceRow,
  type SourcesPeriodWindow,
} from "./sources-types";

type Row = SourceRow & { id: string };
type SortKey =
  | "name"
  | "leads"
  | "contactRate"
  | "visitRate"
  | "winRate"
  | "deals"
  | "revenue"
  | "spend"
  | "costPerLead"
  | "costPerVisit"
  | "costPerDeal";

/** Nulls last in either direction; ties by name. */
function sortRows(rows: Row[], key: SortKey, order: "asc" | "desc"): Row[] {
  return [...rows].sort((a, b) => {
    const left = key === "name" ? a.name.toLowerCase() : a[key];
    const right = key === "name" ? b.name.toLowerCase() : b[key];
    if (left === right) return a.name.localeCompare(b.name);
    if (left === null) return 1;
    if (right === null) return -1;
    const diff = left < right ? -1 : 1;
    return order === "asc" ? diff : -diff;
  });
}

function Rate({ value, part, whole, of }: { value: number | null; part: number; whole: number; of: string }) {
  return (
    <span className="tabular-nums" title={`${formatNumber(part)} of ${formatNumber(whole)} ${of}`}>
      {formatRate(value)}
    </span>
  );
}

function useColumns(currency: string, spendVisible: boolean, period: SourcesPeriodWindow): ColumnDef<Row>[] {
  return useMemo<ColumnDef<Row>[]>(() => {
    const money = (value: number | null) =>
      value === null ? <span className="text-muted-foreground">—</span> : formatCompactMoney(value, currency);
    const columns: ColumnDef<Row>[] = [
      {
        id: "name",
        header: "Source",
        meta: { sortable: true },
        cell: ({ row }) => {
          const href = sourceLeadsHref(row.original.sourceId, period);
          return href ? (
            <Link href={href} className="font-medium hover:text-primary" title="Open the leads created in this period">
              {row.original.name}
            </Link>
          ) : (
            <span className="font-medium text-muted-foreground" title={NO_SOURCE_LINK_HINT}>
              {row.original.name}
            </span>
          );
        },
      },
      {
        id: "leads",
        header: "Leads",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.leads)}</span>,
      },
      {
        id: "contactRate",
        header: "Contacted",
        meta: { sortable: true, align: "right", hideBelow: "lg" },
        cell: ({ row }) => (
          <Rate value={row.original.contactRate} part={row.original.contacted} whole={row.original.leads} of="leads" />
        ),
      },
      {
        id: "visitRate",
        header: "Visited",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => (
          <Rate value={row.original.visitRate} part={row.original.visited} whole={row.original.leads} of="leads" />
        ),
      },
      {
        id: "winRate",
        header: "Win rate",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => (
          <Rate value={row.original.winRate} part={row.original.won} whole={row.original.closed} of="closed" />
        ),
      },
      {
        id: "deals",
        header: "Deals",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.deals)}</span>,
      },
      {
        id: "revenue",
        header: "Revenue",
        meta: { sortable: true, align: "right", hideBelow: "lg" },
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.revenue)}</span>,
      },
    ];
    if (!spendVisible) return columns;
    return [
      ...columns,
      {
        id: "spend",
        header: "Spend",
        meta: { sortable: true, align: "right", hideBelow: "xl" },
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.spend)}</span>,
      },
      {
        id: "costPerLead",
        header: "Per lead",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.costPerLead)}</span>,
      },
      {
        id: "costPerVisit",
        header: "Per visit",
        meta: { sortable: true, align: "right", hideBelow: "xl" },
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.costPerVisit)}</span>,
      },
      {
        id: "costPerDeal",
        header: "Per deal",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.costPerDeal)}</span>,
      },
    ];
  }, [currency, spendVisible, period]);
}

function SourceCard({
  row,
  currency,
  spendVisible,
  period,
}: {
  row: Row;
  currency: string;
  spendVisible: boolean;
  period: SourcesPeriodWindow;
}) {
  const money = (value: number | null) => (value === null ? "—" : formatCompactMoney(value, currency));
  const href = sourceLeadsHref(row.sourceId, period);
  const stats: Array<[string, string]> = [
    ["Leads", formatNumber(row.leads)],
    ["Contacted", formatRate(row.contactRate)],
    ["Visited", formatRate(row.visitRate)],
    ["Win rate", formatRate(row.winRate)],
    ["Deals", formatNumber(row.deals)],
    ["Revenue", money(row.revenue)],
    ...(spendVisible
      ? ([
          ["Per lead", money(row.costPerLead)],
          ["Per deal", money(row.costPerDeal)],
        ] as Array<[string, string]>)
      : []),
  ];
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        {href ? (
          <Link href={href} className="truncate text-sm font-medium hover:text-primary">
            {row.name}
          </Link>
        ) : (
          <span className="truncate text-sm font-medium text-muted-foreground" title={NO_SOURCE_LINK_HINT}>
            {row.name}
          </span>
        )}
        {spendVisible && row.spend !== null ? (
          <span className="shrink-0 text-xs text-muted-foreground">{money(row.spend)} spent</span>
        ) : null}
      </div>
      <dl className="grid grid-cols-4 gap-x-2 gap-y-1.5 text-xs">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-[10px] text-muted-foreground uppercase">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function SourcesTable({
  sources,
  currency,
  spendVisible,
  period,
}: {
  sources: SourceRow[];
  currency: string;
  spendVisible: boolean;
  period: SourcesPeriodWindow;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("leads");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const data = useMemo(
    () =>
      sortRows(
        sources.map((row) => ({ ...row, id: row.sourceId ?? "none" })),
        sortBy,
        sortOrder,
      ),
    [sources, sortBy, sortOrder],
  );
  const columns = useColumns(currency, spendVisible, period);
  const table = useDataTable({ data, columns });

  return (
    <DataTable<Row, SortKey>
      table={table}
      density="compact"
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={(key, order) => {
        setSortBy(key);
        setSortOrder(order);
      }}
      renderCard={(row) => (
        <SourceCard row={row.original} currency={currency} spendVisible={spendVisible} period={period} />
      )}
      scrollClassName="md:max-h-[28rem]"
      aria-label="Lead sources"
      emptyState={
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">No leads were created in this period.</p>
      }
    />
  );
}
