"use client";

import Link from "next/link";
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
  formatAuditEntityType,
  formatAuditMetadata,
} from "@/features/audit/utils/audit-labels";
import { formatRelativeTime } from "@/lib/format";

export function AuditDetailDrawer() {
  const selectedLogId = useAuditUiStore((s) => s.selectedLogId);
  const closeDrawer = useAuditUiStore((s) => s.closeDrawer);
  const { data: log, isLoading, isError } = useAuditLog(selectedLogId ?? undefined);

  const open = Boolean(selectedLogId);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeDrawer()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle>Audit event</SheetTitle>
          <SheetDescription>
            Detailed record of a workspace activity event
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
              <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-3 text-sm">
                <dt className="text-muted-foreground">When</dt>
                <dd>{formatRelativeTime(log.createdAt)}</dd>

                <dt className="text-muted-foreground">Actor</dt>
                <dd>
                  <div>
                    <p>{formatAuditActorLabel(log.actorType, log.actor)}</p>
                    {log.actor?.email ? (
                      <p className="text-xs text-muted-foreground">
                        {log.actor.email}
                      </p>
                    ) : null}
                  </div>
                </dd>

                <dt className="text-muted-foreground">Action</dt>
                <dd>{formatAuditAction(log.action)}</dd>

                <dt className="text-muted-foreground">Entity</dt>
                <dd>{formatAuditEntityType(log.entityType)}</dd>

                <dt className="text-muted-foreground">Entity ID</dt>
                <dd className="font-mono text-xs break-all">
                  {log.entityId ?? "—"}
                </dd>
              </dl>

              {log.entityId ? (
                <div className="flex flex-wrap gap-2">
                  {log.entityType === "User" ? (
                    <Link
                      href={`/users?userId=${log.entityId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open user
                    </Link>
                  ) : null}
                  {log.entityType === "Role" ? (
                    <Link
                      href={`/roles?roleId=${log.entityId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open role
                    </Link>
                  ) : null}
                  {log.entityType === "FileAsset" ? (
                    <Link
                      href={`/files?fileId=${log.entityId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open file
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Metadata
                </h3>
                <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
                  {formatAuditMetadata(log.metadata)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
