"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Lead } from "@/features/leads/types";
import {
  formatLastContacted,
  getPrimaryProjectInterest,
  isStaleContact,
} from "@/features/leads/utils/lead-formatters";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LeadRowActions } from "../components/lead-row-actions";
import { LeadStageBadge } from "../components/lead-status-badge";
import { LeadAssigneeCell } from "../components/leads-table-cells";
import { MaskedContact } from "../components/masked-contact";
import { HeatBadge, NextStepLabel } from "../components/workflow-visuals";
import { useLeadUiStore } from "../stores/lead-ui-store";

/** Columns hidden until the user turns them on from the View menu. */
export const LEADS_DEFAULT_HIDDEN: Record<string, boolean> = {
  createdAt: false,
};

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
      enableHiding: false,
      size: 40,
    },
    {
      id: "fullName",
      accessorKey: "fullName",
      header: "Lead",
      cell: ({ row }) => <LeadPrimaryCell lead={row.original} />,
      enableSorting: true,
      enableHiding: false,
      size: 300,
      meta: { label: "Lead", required: true, sortable: true },
    },
    {
      id: "contact",
      header: "Contact",
      cell: ({ row }) => <LeadContactCell lead={row.original} />,
      enableSorting: false,
      size: 190,
      meta: { label: "Contact" },
    },
    {
      id: "source",
      header: "Source",
      cell: ({ row }) => (
        <span className="block truncate">
          {row.original.source?.name ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
      enableSorting: false,
      size: 130,
      meta: { label: "Source" },
    },
    {
      id: "assignee",
      header: "Agent",
      cell: ({ row }) => <LeadAssigneeCell assignee={row.original.assignee} />,
      enableSorting: false,
      size: 160,
      meta: { label: "Agent" },
    },
    {
      id: "nextTaskDueAt",
      accessorKey: "nextTaskDueAt",
      header: "Next step",
      cell: ({ row }) => (
        <NextStepLabel
          nextTaskDueAt={row.original.nextTaskDueAt}
          isClosed={row.original.stage.isClosed || row.original.status === "ARCHIVED"}
        />
      ),
      enableSorting: true,
      size: 140,
      meta: { label: "Next step", sortable: true },
    },
    {
      id: "lastContactedAt",
      accessorKey: "lastContactedAt",
      header: "Last contact",
      cell: ({ row }) => <LeadLastContactCell lastContactedAt={row.original.lastContactedAt} />,
      enableSorting: true,
      size: 120,
      meta: { label: "Last contact", sortable: true },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {formatRelativeTime(row.original.createdAt)}
        </span>
      ),
      enableSorting: true,
      size: 110,
      meta: { label: "Created", sortable: true },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <LeadRowActions lead={row.original} />,
      enableSorting: false,
      enableHiding: false,
      size: 48,
      meta: { align: "right" },
    },
  ];
}

function LeadPrimaryCell({ lead }: { lead: Lead }) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const interest = getPrimaryProjectInterest(lead);
  const archived = lead.status === "ARCHIVED";

  return (
    <button
      type="button"
      className="group/name block w-full min-w-0 text-left"
      onClick={(event) => {
        event.stopPropagation();
        openDrawer(lead.id);
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-[13px] font-medium text-foreground group-hover/name:underline">
          {lead.fullName}
        </span>
        {lead.stage.isClosed || archived ? null : <HeatBadge heat={lead.heat} compact />}
      </span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5">
        <LeadStageBadge stage={lead.stage} archived={archived} size="xs" />
        {interest ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {interest.project.name}
            {lead.projectInterests.length > 1 ? ` +${lead.projectInterests.length - 1}` : ""}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function LeadContactCell({ lead }: { lead: Lead }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <MaskedContact leadId={lead.id} field="primaryPhone" masked={lead.primaryPhone} variant="compact" />
      {lead.email ? (
        <MaskedContact
          leadId={lead.id}
          field="email"
          masked={lead.email}
          variant="compact"
          className="text-[11px]"
        />
      ) : (
        <span className="text-[11px] text-muted-foreground">No email</span>
      )}
    </div>
  );
}

function LeadLastContactCell({ lastContactedAt }: { lastContactedAt: string | null }) {
  const stale = isStaleContact(lastContactedAt);
  return (
    <span
      className={cn(
        "tabular-nums",
        stale ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      {formatLastContacted(lastContactedAt)}
    </span>
  );
}
