"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/features/audit/types";
import {
  formatAuditAction,
  formatAuditEntityType,
  formatAuditSummary,
  formatAuditTime,
  getAuditActionBadgeClass,
  getAuditEntityHref,
  getAuditTargetLabel,
} from "@/features/audit/utils/audit-labels";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

export const auditColumns: ColumnDef<AuditLog>[] = [
  {
    id: "createdAt",
    header: "When",
    cell: ({ row }) => (
      <div className="min-w-[5.5rem]">
        <p className="font-medium text-foreground">{formatRelativeTime(row.original.createdAt)}</p>
        <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {formatAuditTime(row.original.createdAt)}
        </p>
      </div>
    ),
  },
  {
    id: "event",
    header: "Event",
    cell: ({ row }) => <AuditEventCell log={row.original} />,
  },
  {
    id: "action",
    header: "Action",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn("text-[10px] font-medium", getAuditActionBadgeClass(row.original.action))}
      >
        {formatAuditAction(row.original.action)}
      </Badge>
    ),
  },
  {
    id: "entityType",
    header: "Entity",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatAuditEntityType(row.original.entityType)}</span>
    ),
  },
  {
    id: "target",
    header: "Target",
    cell: ({ row }) => <AuditTargetCell log={row.original} />,
  },
];

function AuditEventCell({ log }: { log: AuditLog }) {
  const actorName = log.actor?.fullName ?? "System";
  const detail = typeof log.metadata?.detail === "string" ? log.metadata.detail : null;

  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback className="text-[10px]">{getInitials(actorName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{formatAuditSummary(log)}</p>
        {detail ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{detail}</p>
        ) : log.actor?.email ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{log.actor.email}</p>
        ) : null}
      </div>
    </div>
  );
}

function AuditTargetCell({ log }: { log: AuditLog }) {
  const label = getAuditTargetLabel(log);
  const href = getAuditEntityHref(log.entityType, log.entityId);

  if (href) {
    return (
      <Link
        href={href}
        className="font-medium text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {label}
      </Link>
    );
  }

  return <span className="text-muted-foreground">{label}</span>;
}
