"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog } from "@/features/audit/hooks";
import { useAuditUiStore } from "@/features/audit/stores/audit-ui-store";
import {
  formatAuditAction,
  formatAuditActorLabel,
  formatAuditDateTime,
  formatAuditEntityType,
  formatAuditSummary,
  getAuditActionBadgeClass,
  getAuditEntityHref,
  getAuditTargetLabel,
  getReadableMetadataEntries,
} from "@/features/audit/utils/audit-labels";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AuditDetailDrawer() {
  const selectedLogId = useAuditUiStore((s) => s.selectedLogId);
  const closeDrawer = useAuditUiStore((s) => s.closeDrawer);
  const { data: log, isLoading, isError } = useAuditLog(selectedLogId ?? undefined);

  const open = Boolean(selectedLogId);
  const href = log
    ? getAuditEntityHref(log.entityType, log.entityId)
    : null;
  const metadataEntries = getReadableMetadataEntries(log?.metadata ?? null);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeDrawer()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle>Event details</SheetTitle>
          <SheetDescription>
            What happened, who did it, and related context
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && !log ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}

          {isError ? (
            <p className="text-sm text-destructive">Failed to load audit event</p>
          ) : null}

          {log ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium",
                    getAuditActionBadgeClass(log.action),
                  )}
                >
                  {formatAuditAction(log.action)}
                </Badge>
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  {formatAuditSummary(log)}
                </p>
              </div>

              <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-muted-foreground">When</dt>
                <dd>
                  <p>{formatAuditDateTime(log.createdAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </p>
                </dd>

                <dt className="text-muted-foreground">Actor</dt>
                <dd>
                  <p>{formatAuditActorLabel(log.actorType, log.actor)}</p>
                  {log.actor?.email ? (
                    <p className="text-xs text-muted-foreground">
                      {log.actor.email}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {log.actorType === "SYSTEM"
                        ? "Automated system event"
                        : "No email available"}
                    </p>
                  )}
                </dd>

                <dt className="text-muted-foreground">Entity</dt>
                <dd>{formatAuditEntityType(log.entityType)}</dd>

                <dt className="text-muted-foreground">Target</dt>
                <dd className="min-w-0">
                  <p className="break-words">{getAuditTargetLabel(log)}</p>
                  {log.entityId ? (
                    <p className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
                      {log.entityId}
                    </p>
                  ) : null}
                </dd>
              </dl>

              {href ? (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={href}>Open {formatAuditEntityType(log.entityType).toLowerCase()}</Link>
                </Button>
              ) : null}

              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Details
                </h3>
                {metadataEntries.length > 0 ? (
                  <dl className="divide-y divide-border/50 rounded-lg border border-border/60">
                    {metadataEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="grid grid-cols-[7rem_1fr] gap-3 px-3 py-2.5 text-xs"
                      >
                        <dt className="text-muted-foreground">{entry.label}</dt>
                        <dd className="break-words text-foreground">
                          {entry.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-muted-foreground">
                    No additional details were recorded for this event.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
