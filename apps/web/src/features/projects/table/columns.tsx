"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { ProjectRowActions } from "@/features/projects/components/project-row-actions";
import type { Project } from "@/features/projects/types";
import { formatNumber, formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Column ids double as the API sort field where `meta.sortable` is set. */
export const projectColumns: ColumnDef<Project>[] = [
  {
    id: "name",
    header: "Project",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground">
          {getInitials(row.original.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.original.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {row.original.location?.trim() || "No location"}
          </p>
        </div>
      </div>
    ),
    meta: { sortable: true },
  },
  {
    id: "developer",
    header: "Developer",
    cell: ({ row }) => {
      const { developer } = row.original;
      return (
        <Link
          href={`/developers?developerId=${developer.id}&search=${encodeURIComponent(developer.name)}`}
          className="font-medium text-foreground/80 transition-colors hover:text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          {developer.name}
        </Link>
      );
    },
  },
  {
    id: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span
          className={cn(
            "size-1.5 rounded-full",
            row.original.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        {row.original.isActive ? "Active" : "Inactive"}
      </span>
    ),
    meta: { sortable: true },
  },
  {
    id: "leads",
    header: "Leads",
    cell: ({ row }) => {
      const leadCount = row.original.interestedLeadCount ?? 0;
      if (leadCount === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <Link
          href={`/leads?projectId=${row.original.id}`}
          className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground transition-colors hover:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          <AppIcons.leads className="size-3 text-muted-foreground" />
          {formatNumber(leadCount)}
        </Link>
      );
    },
  },
  {
    id: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.updatedAt)}</span>
    ),
    meta: { sortable: true, hideBelow: "md" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    // Menu clicks bubble through the portal; keep them from selecting the row.
    cell: ({ row }) => (
      <div onClick={(event) => event.stopPropagation()}>
        <ProjectRowActions project={row.original} />
      </div>
    ),
    meta: { align: "right", headerClassName: "w-10 px-2", cellClassName: "px-2" },
  },
];
