"use client";

import { Badge } from "@/components/ui/badge";
import type {
  AdminAuditLog,
  AdminSecurityEvent,
} from "@/features/audit/types";
import {
  formatAuditAction,
  formatAuditEntityType,
} from "@/lib/audit-labels";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AuditTableProps {
  logs: AdminAuditLog[];
  onSelect: (id: string) => void;
}

export function AuditTable({ logs, onSelect }: AuditTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Action
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Actor
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase md:table-cell">
              Entity
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
              IP
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20"
              onClick={() => onSelect(log.id)}
            >
              <td className="px-3 py-2">
                <span className="font-medium text-foreground">
                  {formatAuditAction(log.action)}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {log.actor?.fullName ?? log.actorType}
                  </p>
                  {log.actor?.email ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {log.actor.email}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="hidden px-3 py-2 md:table-cell">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] font-medium"
                  >
                    {formatAuditEntityType(log.entityType)}
                  </Badge>
                  {log.entityId ? (
                    <span className="max-w-[10rem] truncate font-mono text-[10px] text-muted-foreground">
                      {log.entityId}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="hidden px-3 py-2 font-mono text-xs text-muted-foreground lg:table-cell">
                {log.ipAddress ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {formatRelativeTime(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SecurityEventsTableProps {
  events: AdminSecurityEvent[];
  onSelect: (id: string) => void;
}

export function SecurityEventsTable({
  events,
  onSelect,
}: SecurityEventsTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Event
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Severity
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Admin
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
              IP
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr
              key={event.id}
              className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20"
              onClick={() => onSelect(event.id)}
            >
              <td className="px-3 py-2">
                <span className="font-medium text-foreground">
                  {event.eventType.replaceAll("_", " ")}
                </span>
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-[10px] font-medium",
                    severityClass(event.severity),
                  )}
                >
                  {event.severity}
                </Badge>
              </td>
              <td className="px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {event.admin?.fullName ?? "—"}
                  </p>
                  {event.admin?.email ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {event.admin.email}
                    </p>
                  ) : null}
                </div>
              </td>
              <td className="hidden px-3 py-2 font-mono text-xs text-muted-foreground lg:table-cell">
                {event.ipAddress ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {formatRelativeTime(event.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function severityClass(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300";
    case "HIGH":
      return "border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "MEDIUM":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}
