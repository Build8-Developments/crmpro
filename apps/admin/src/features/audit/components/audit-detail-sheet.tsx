"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLog, useSecurityEvent } from "@/features/audit/hooks";
import type { AuditTab } from "@/features/audit/types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AuditDetailSheetProps {
  tab: AuditTab;
  selectedId: string | null;
  onClose: () => void;
}

export function AuditDetailSheet({
  tab,
  selectedId,
  onClose,
}: AuditDetailSheetProps) {
  const open = Boolean(selectedId);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {tab === "audit" ? "Audit log" : "Security event"}
          </SheetTitle>
          <SheetDescription>
            Full record details for investigation and accountability.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-1">
          {tab === "audit" ? (
            <AuditLogDetail id={selectedId ?? undefined} />
          ) : (
            <SecurityEventDetail id={selectedId ?? undefined} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditLogDetail({ id }: { id: string | undefined }) {
  const { data, isLoading, isError } = useAuditLog(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">Failed to load audit log.</p>
    );
  }

  return (
    <div className="space-y-4">
      <DetailRow label="Action" value={data.action} />
      <DetailRow label="Actor type" value={data.actorType} />
      <DetailRow
        label="Actor"
        value={
          data.actor
            ? `${data.actor.fullName} (${data.actor.email})`
            : "—"
        }
      />
      <DetailRow label="Entity type" value={data.entityType} />
      <DetailRow label="Entity ID" value={data.entityId ?? "—"} mono />
      <DetailRow label="IP address" value={data.ipAddress ?? "—"} mono />
      <DetailRow label="User agent" value={data.userAgent ?? "—"} />
      <DetailRow label="Fingerprint" value={data.fingerprint ?? "—"} mono />
      <DetailRow
        label="Created"
        value={`${formatRelativeTime(data.createdAt)} · ${new Date(data.createdAt).toLocaleString()}`}
      />
      <MetadataBlock metadata={data.metadata} />
    </div>
  );
}

function SecurityEventDetail({ id }: { id: string | undefined }) {
  const { data, isLoading, isError } = useSecurityEvent(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) {
    return (
      <p className="text-sm text-destructive">Failed to load security event.</p>
    );
  }

  return (
    <div className="space-y-4">
      <DetailRow
        label="Event type"
        value={data.eventType.replaceAll("_", " ")}
      />
      <div className="space-y-1">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Severity
        </p>
        <Badge
          variant="outline"
          className={cn("h-5 px-1.5 text-[10px] font-medium")}
        >
          {data.severity}
        </Badge>
      </div>
      <DetailRow
        label="Admin"
        value={
          data.admin
            ? `${data.admin.fullName} (${data.admin.email})`
            : "—"
        }
      />
      <DetailRow label="IP address" value={data.ipAddress ?? "—"} mono />
      <DetailRow label="User agent" value={data.userAgent ?? "—"} />
      <DetailRow label="Fingerprint" value={data.fingerprint ?? "—"} mono />
      <DetailRow
        label="Created"
        value={`${formatRelativeTime(data.createdAt)} · ${new Date(data.createdAt).toLocaleString()}`}
      />
      <MetadataBlock metadata={data.metadata} />
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "break-all text-sm text-foreground",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MetadataBlock({
  metadata,
}: {
  metadata: Record<string, unknown> | null;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Metadata
      </p>
      {metadata && Object.keys(metadata).length > 0 ? (
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] text-foreground">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
