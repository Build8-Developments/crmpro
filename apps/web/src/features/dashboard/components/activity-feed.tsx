"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import type { ActivityFeedItem } from "@/features/dashboard/types";
import { getActivityHref } from "@/features/dashboard/activity-links";
import { formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getActivityMeta } from "../activity-icons";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface ActivityFeedProps {
  activity: ActivityFeedItem[];
}

function ActivityFeedRow({
  item,
  index,
}: {
  item: ActivityFeedItem;
  index: number;
}) {
  const meta = getActivityMeta(item.type);
  const Icon = meta.icon;
  const href = getActivityHref(item);

  const content = (
    <>
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          meta.iconClassName,
        )}
      >
        <Icon className="size-3.5" stroke={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-start justify-between gap-2">
          <p className="text-xs leading-snug text-foreground">{item.title}</p>
          <Badge
            className={cn(
              "h-5 shrink-0 border px-1.5 text-[10px]",
              meta.badgeClassName,
            )}
          >
            {meta.label}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {formatRelativeTime(item.occurredAt)}
        </p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div
        className="flex items-start gap-2.5 px-3.5 py-2"
        style={dashboardEnterStyle(index + 6)}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-start gap-2.5 px-3.5 py-2 transition-colors duration-150 hover:bg-muted/30"
      style={dashboardEnterStyle(index + 6)}
    >
      {content}
    </Link>
  );
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  return (
    <DashboardSectionCard
      icon={AppIcons.activity}
      title="Recent Activity"
      subtitle="Latest workspace events"
      badges={
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {activity.length} events
        </Badge>
      }
      style={dashboardEnterStyle(5)}
      contentClassName="p-0"
      className="flex max-h-80 flex-col"
    >
      <ScrollArea className="h-72">
        <div className="divide-y divide-border/50">
          {activity.map((item, index) => (
            <ActivityFeedRow key={item.id} item={item} index={index} />
          ))}
        </div>
      </ScrollArea>
    </DashboardSectionCard>
  );
}
