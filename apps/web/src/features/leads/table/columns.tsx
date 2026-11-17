"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AppIcons } from "@/components/icons/app-icons";
import type { Lead } from "@/features/leads/types";
import {
  formatLastContacted,
  getPrimaryProjectInterest,
  isStaleContact,
} from "@/features/leads/utils/lead-formatters";
import { formatRelativeTime } from "@/lib/format";
import { formatDueDate, isPastDue } from "@/features/tasks/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LeadRowActions } from "../components/lead-row-actions";
import { LeadStageBadge } from "../components/lead-status-badge";
import { LeadAssigneeCell } from "../components/leads-table-cells";
import { useLeadUiStore } from "../stores/lead-ui-store";

export const LEADS_SORTABLE_COLUMNS = new Set([
  "fullName",
  "lastContactedAt",
  "nextFollowUpAt",
  "createdAt",
  "updatedAt",
]);

export function createLeadColumns(): ColumnDef<Lead>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          className="size-3.5"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          className="size-3.5"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select lead"
          onClick={(event) => event.stopPropagation()}
        />
      ),
      enableSorting: false,
    },
    {
      id: "fullName",
      accessorKey: "fullName",
      header: "Lead",
      cell: ({ row }) => <LeadPrimaryCell lead={row.original} />,
      enableSorting: true,
    },
    {
      id: "stage",
      header: "Stage",
      cell: ({ row }) => (
        <LeadStageBadge
          stage={row.original.stage}
          archived={row.original.status === "ARCHIVED"}
        />
      ),
      enableSorting: false,
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => <LeadContactCell lead={row.original} />,
      enableSorting: false,
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="block truncate text-[11px]">
          {row.original.source?.name ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "assignee",
      header: "Agent",
      cell: ({ row }) => (
        <LeadAssigneeCell assignee={row.original.assignee} />
      ),
      enableSorting: false,
    },
    {
      id: "lastContactedAt",
      accessorKey: "lastContactedAt",
      header: "Contacted",
      cell: ({ row }) => (
        <LeadLastContactCell lastContactedAt={row.original.lastContactedAt} />
      ),
      enableSorting: true,
    },
    {
      id: "nextFollowUpAt",
      accessorKey: "nextFollowUpAt",
      header: "Follow-up",
      cell: ({ row }) => (
        <LeadFollowUpCell nextFollowUpAt={row.original.nextFollowUpAt} />
      ),
      enableSorting: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {formatRelativeTime(row.original.createdAt)}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <LeadRowActions lead={row.original} />,
      enableSorting: false,
    },
  ];
}

function LeadPrimaryCell({ lead }: { lead: Lead }) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const interest = getPrimaryProjectInterest(lead);

  return (
    <button
      type="button"
      className="min-w-0 text-left hover:underline"
      onClick={(event) => {
        event.stopPropagation();
        openDrawer(lead.id);
      }}
    >
      <p className="truncate font-medium text-foreground">{lead.fullName}</p>
      {interest ? (
        <p className="truncate text-[10px] text-muted-foreground">
          {interest.project.name}
          {lead.projectInterests.length > 1
            ? ` +${lead.projectInterests.length - 1}`
            : ""}
        </p>
      ) : null}
    </button>
  );
}

function LeadContactCell({ lead }: { lead: Lead }) {
  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(lead.primaryPhone);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="group/contact min-w-0">
      <div className="flex items-center gap-0.5">
        <span className="truncate tabular-nums">{lead.primaryPhone}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="size-5 shrink-0 opacity-0 group-hover/contact:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            void copyPhone();
          }}
          aria-label="Copy phone"
        >
          <AppIcons.copy className="size-2.5" />
        </Button>
      </div>
      <p className="truncate text-[10px] text-muted-foreground">
        {lead.email ?? "—"}
      </p>
    </div>
  );
}

function LeadLastContactCell({
  lastContactedAt,
}: {
  lastContactedAt: string | null;
}) {
  const stale = isStaleContact(lastContactedAt);
  return (
    <span
      className={cn(
        "tabular-nums",
        stale
          ? "font-medium text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
      )}
    >
      {formatLastContacted(lastContactedAt)}
    </span>
  );
}

function LeadFollowUpCell({ nextFollowUpAt }: { nextFollowUpAt: string | null }) {
  if (!nextFollowUpAt) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        isPastDue(nextFollowUpAt)
          ? "font-medium text-destructive"
          : "text-muted-foreground",
      )}
    >
      {formatDueDate(nextFollowUpAt)}
    </span>
  );
}
