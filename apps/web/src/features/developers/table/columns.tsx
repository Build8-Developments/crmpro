"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { DeveloperRowActions } from "@/features/developers/components/developer-row-actions";
import type { Developer } from "@/features/developers/types";
import { formatNumber, formatRelativeTime, getInitials } from "@/lib/format";

/** Column ids double as the API sort field where `meta.sortable` is set. */
export const developerColumns: ColumnDef<Developer>[] = [
  {
    id: "name",
    header: "Developer",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground">
          {getInitials(row.original.name)}
        </span>
        <span className="truncate text-sm font-medium text-foreground">{row.original.name}</span>
      </div>
    ),
    meta: { sortable: true },
  },
  {
    id: "projects",
    header: "Projects",
    cell: ({ row }) => {
      const projectCount = row.original.projectCount ?? 0;
      if (projectCount === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <Link
          href={`/projects?developerId=${row.original.id}`}
          className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground transition-colors hover:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          <AppIcons.projects className="size-3 text-muted-foreground" />
          {formatNumber(projectCount)}
        </Link>
      );
    },
  },
  {
    id: "leads",
    header: "Leads",
    cell: ({ row }) => {
      const leadCount = row.original.interestedLeadCount ?? 0;
      if (leadCount === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
          <AppIcons.leads className="size-3 text-muted-foreground" />
          {formatNumber(leadCount)}
        </span>
      );
    },
  },
  {
    id: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.updatedAt)}</span>
    ),
    meta: { sortable: true, hideBelow: "sm" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    // Menu clicks bubble through the portal; keep them from selecting the row.
    cell: ({ row }) => (
      <div onClick={(event) => event.stopPropagation()}>
        <DeveloperRowActions developer={row.original} />
      </div>
    ),
    meta: { align: "right", headerClassName: "w-10 px-2", cellClassName: "px-2" },
  },
];
