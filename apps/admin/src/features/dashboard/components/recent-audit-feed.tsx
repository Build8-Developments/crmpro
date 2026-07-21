"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PlatformRecentAuditItem } from "@/features/dashboard/types";
import {
  formatAuditAction,
  formatAuditEntityType,
  formatAuditSummary,
} from "@/lib/audit-labels";
import { formatRelativeTime } from "@/lib/format";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface RecentAuditFeedProps {
  items: PlatformRecentAuditItem[];
}

function AuditFeedRow({
  item,
  index,
}: {
  item: PlatformRecentAuditItem;
  index: number;
}) {
  const actorLabel = item.actor?.fullName ?? "System";

  return (
    <div
      className="flex items-start gap-2.5 px-3.5 py-2.5"
      style={dashboardEnterStyle(index + 6)}
    >
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <AppIcons.audit className="size-3.5" stroke={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-start justify-between gap-2">
          <p className="text-xs leading-snug text-foreground">
            <span className="font-medium">
              {formatAuditSummary(item.action, item.entityType, item.entityId)}
            </span>
          </p>
          <Badge
            variant="outline"
            className="h-5 shrink-0 px-1.5 text-[10px]"
          >
            {formatAuditEntityType(item.entityType)}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {actorLabel}
          <span className="mx-1">·</span>
          {formatRelativeTime(item.createdAt)}
          <span className="mx-1">·</span>
          {formatAuditAction(item.action)}
        </p>
      </div>
    </div>
  );
}

export function RecentAuditFeed({ items }: RecentAuditFeedProps) {
  return (
    <DashboardSectionCard
      icon={AppIcons.audit}
      title="Recent activity"
      subtitle="What operators changed recently"
      badges={
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {items.length} events
          </Badge>
          <Link
            href="/audit-logs"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      }
      style={dashboardEnterStyle(5)}
      contentClassName="p-0"
      className="flex max-h-80 flex-col"
    >
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          No recent operator activity
        </div>
      ) : (
        <ScrollArea className="h-72">
          <div className="divide-y divide-border/50">
            {items.map((item, index) => (
              <AuditFeedRow key={item.id} item={item} index={index} />
            ))}
          </div>
        </ScrollArea>
      )}
    </DashboardSectionCard>
  );
}
