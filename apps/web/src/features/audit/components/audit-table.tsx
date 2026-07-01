"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/features/audit/types";
import {
  formatAuditAction,
  formatAuditActorLabel,
  formatAuditEntityType,
} from "@/features/audit/utils/audit-labels";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AuditTableProps {
  logs: AuditLog[];
  onSelectLog: (logId: string) => void;
  selectedLogId?: string | null;
}

function EntityLink({ log }: { log: AuditLog }) {
  if (!log.entityId) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (log.entityType === "User") {
    return (
      <Link
        href={`/users?userId=${log.entityId}`}
        className="text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        View user
      </Link>
    );
  }

  if (log.entityType === "Role") {
    return (
      <Link
        href={`/roles?roleId=${log.entityId}`}
        className="text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        View role
      </Link>
    );
  }

  if (log.entityType === "FileAsset") {
    return (
      <Link
        href={`/files?fileId=${log.entityId}`}
        className="text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        View file
      </Link>
    );
  }

  return (
    <span className="font-mono text-[11px] text-muted-foreground">
      {log.entityId.slice(0, 8)}…
    </span>
  );
}

export function AuditTable({ logs, onSelectLog, selectedLogId }: AuditTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                When
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Actor
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
              return (
                <tr
                  key={log.id}
                  className={cn(
                    "cursor-pointer border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/20",
                    selected && "bg-primary/5",
                  )}
                  onClick={() => onSelectLog(log.id)}
                >
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">
                        {formatAuditActorLabel(log.actorType, log.actor)}
                      </p>
                      {log.actor?.email ? (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {log.actor.email}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {formatAuditAction(log.action)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatAuditEntityType(log.entityType)}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <EntityLink log={log} />
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
