"use client";

import Link from "next/link";
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

interface AuditTableProps {
  logs: AuditLog[];
  onSelectLog: (logId: string) => void;
  selectedLogId?: string | null;
}

function TargetCell({ log }: { log: AuditLog }) {
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

export function AuditTable({ logs, onSelectLog, selectedLogId }: AuditTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                When
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Event
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Action
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Entity
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Target
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const selected = log.id === selectedLogId;
              const actorName = log.actor?.fullName ?? "System";
              const detail =
                typeof log.metadata?.detail === "string"
                  ? log.metadata.detail
                  : null;

              return (
                <tr
                  key={log.id}
                  className={cn(
                    "cursor-pointer border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/20",
                    selected && "bg-primary/5",
                  )}
                  onClick={() => onSelectLog(log.id)}
                >
                  <td className="px-3 py-3 align-top">
                    <div className="min-w-[5.5rem]">
                      <p className="text-xs font-medium text-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {formatAuditTime(log.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Avatar size="sm" className="mt-0.5">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(actorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                          {formatAuditSummary(log)}
                        </p>
                        {detail ? (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {detail}
                          </p>
                        ) : log.actor?.email ? (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {log.actor.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium",
                        getAuditActionBadgeClass(log.action),
                      )}
                    >
                      {formatAuditAction(log.action)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                    {formatAuditEntityType(log.entityType)}
                  </td>
                  <td className="px-3 py-3 align-top text-xs">
                    <TargetCell log={log} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
