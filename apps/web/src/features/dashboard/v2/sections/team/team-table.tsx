"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { METRIC_LABELS, formatMetricValue } from "@/features/targets/utils/target-format";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  formatMinutes,
  formatPct,
  teamLeadsHref,
  type TeamMember,
} from "./team-types";

type SortKey =
  | "name"
  | "interactionsToday"
  | "interactionsThisWeek"
  | "interactions"
  | "taskCompletionPct"
  | "overdueNow"
  | "slaCompliancePct"
  | "medianFirstResponseMinutes"
  | "visits"
  | "deals"
  | "targetPercent";

function sortValue(member: TeamMember, key: SortKey): number | string | null {
  return key === "name" ? member.name.toLowerCase() : member[key];
}

/** Nulls always sort last, whatever the direction. */
function sortMembers(members: TeamMember[], key: SortKey, order: "asc" | "desc") {
  return [...members].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (left === right) return a.name.localeCompare(b.name);
    if (left === null) return 1;
    if (right === null) return -1;
    const diff = left < right ? -1 : 1;
    return order === "asc" ? diff : -diff;
  });
}

/** Tone for a 0–100 rate: green when healthy, amber when slipping, red when bad. */
function rateTone(value: number | null, good = 80, ok = 60): string {
  if (value === null) return "text-muted-foreground";
  if (value >= good) return "text-emerald-600 dark:text-emerald-400";
  if (value >= ok) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function targetTitle(member: TeamMember, currency: string): string {
  if (member.targets.length === 0) return "No target set";
  return member.targets
    .map(
      (target) =>
        `${METRIC_LABELS[target.metric]}: ${formatMetricValue(target.metric, target.actual, currency)} of ${formatMetricValue(target.metric, target.target, currency)} (${Math.round(target.percent)}%)`,
    )
    .join("\n");
}

function CountLink({ href, value, title }: { href: string; value: number; title?: string }) {
  return (
    <Link
      href={href}
      title={title}
      className="tabular-nums underline-offset-2 hover:text-primary hover:underline"
      onClick={(event) => event.stopPropagation()}
    >
      {formatNumber(value)}
    </Link>
  );
}

function useColumns(currency: string): ColumnDef<TeamMember>[] {
  return useMemo<ColumnDef<TeamMember>[]>(
    () => [
      {
        id: "name",
        header: "Person",
        meta: { sortable: true },
        cell: ({ row }) => (
          <Link
            href={teamLeadsHref(row.original.id)}
            className="block min-w-0 hover:text-primary"
            title="Open their leads"
          >
            <span className="block truncate font-medium text-foreground">{row.original.name}</span>
            {row.original.team ? (
              <span className="block truncate text-[11px] text-muted-foreground">
                {row.original.team.name}
              </span>
            ) : null}
          </Link>
        ),
      },
      {
        id: "interactionsToday",
        header: "Today",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.interactionsToday)}</span>,
      },
      {
        id: "interactionsThisWeek",
        header: "Week",
        meta: { sortable: true, align: "right", hideBelow: "lg" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.interactionsThisWeek)}</span>,
      },
      {
        id: "interactions",
        header: "Period",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.interactions)}</span>,
      },
      {
        id: "taskCompletionPct",
        header: "Tasks done",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => (
          <span
            className={cn("tabular-nums", rateTone(row.original.taskCompletionPct))}
            title={`${formatNumber(row.original.tasksDone)} done of ${formatNumber(row.original.tasksDue)} due`}
          >
            {formatPct(row.original.taskCompletionPct)}
          </span>
        ),
      },
      {
        id: "overdueNow",
        header: "Overdue",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) =>
          row.original.overdueNow > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              <CountLink
                href={teamLeadsHref(row.original.id, "overdue")}
                value={row.original.overdueNow}
                title="Leads with an overdue next step"
              />
            </span>
          ) : (
            <span className="text-muted-foreground tabular-nums">0</span>
          ),
      },
      {
        id: "slaCompliancePct",
        header: "SLA",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => (
          <span
            className={cn("tabular-nums", rateTone(row.original.slaCompliancePct, 90, 70))}
            title={`${formatNumber(row.original.slaHits)} on time · ${formatNumber(row.original.slaMisses)} late`}
          >
            {formatPct(row.original.slaCompliancePct)}
          </span>
        ),
      },
      {
        id: "medianFirstResponseMinutes",
        header: "1st reply",
        meta: { sortable: true, align: "right", hideBelow: "lg" },
        cell: ({ row }) => (
          <span
            className="tabular-nums"
            title={`Median of ${formatNumber(row.original.firstResponseSamples)} leads (working time)`}
          >
            {formatMinutes(row.original.medianFirstResponseMinutes)}
          </span>
        ),
      },
      {
        id: "visits",
        header: "Visits",
        meta: { sortable: true, align: "right", hideBelow: "xl" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.visits)}</span>,
      },
      {
        id: "deals",
        header: "Deals",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.deals)}</span>,
      },
      {
        id: "targetPercent",
        header: "Target",
        meta: { sortable: true, align: "right" },
        cell: ({ row }) => (
          <span
            className={cn("tabular-nums", rateTone(row.original.targetPercent, 100, 70))}
            title={targetTitle(row.original, currency)}
          >
            {formatPct(row.original.targetPercent)}
          </span>
        ),
      },
    ],
    [currency],
  );
}

function MemberCard({ member, currency }: { member: TeamMember; currency: string }) {
  const stats: Array<[string, string, string?]> = [
    ["Today", formatNumber(member.interactionsToday)],
    ["Week", formatNumber(member.interactionsThisWeek)],
    ["Period", formatNumber(member.interactions)],
    ["Tasks", formatPct(member.taskCompletionPct), rateTone(member.taskCompletionPct)],
    ["SLA", formatPct(member.slaCompliancePct), rateTone(member.slaCompliancePct, 90, 70)],
    ["1st reply", formatMinutes(member.medianFirstResponseMinutes)],
    ["Visits", formatNumber(member.visits)],
    ["Deals", formatNumber(member.deals)],
  ];
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={teamLeadsHref(member.id)} className="min-w-0 hover:text-primary">
          <span className="block truncate text-sm font-medium">{member.name}</span>
          {member.team ? (
            <span className="block truncate text-[11px] text-muted-foreground">{member.team.name}</span>
          ) : null}
        </Link>
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {member.overdueNow > 0 ? (
            <Link
              href={teamLeadsHref(member.id, "overdue")}
              className="rounded-md bg-red-500/10 px-1.5 py-0.5 font-medium text-red-600 dark:text-red-400"
            >
              {formatNumber(member.overdueNow)} overdue
            </Link>
          ) : null}
          <span
            className={cn("tabular-nums", rateTone(member.targetPercent, 100, 70))}
            title={targetTitle(member, currency)}
          >
            {member.targetPercent === null ? "No target" : `${formatPct(member.targetPercent)} of target`}
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-4 gap-x-2 gap-y-1.5 text-xs">
        {stats.map(([label, value, tone]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-[10px] text-muted-foreground uppercase">{label}</dt>
            <dd className={cn("tabular-nums", tone)}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TeamTable({ members, currency }: { members: TeamMember[]; currency: string }) {
  const [sortBy, setSortBy] = useState<SortKey>("interactions");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const data = useMemo(() => sortMembers(members, sortBy, sortOrder), [members, sortBy, sortOrder]);
  const columns = useColumns(currency);
  const table = useDataTable({ data, columns });

  return (
    <DataTable<TeamMember, SortKey>
      table={table}
      density="compact"
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={(key, order) => {
        setSortBy(key);
        setSortOrder(order);
      }}
      renderCard={(row) => <MemberCard member={row.original} currency={currency} />}
      scrollClassName="md:max-h-[28rem]"
      aria-label="Team activity"
      emptyState={
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">
          Nobody in your scope works leads yet.
        </p>
      }
    />
  );
}
