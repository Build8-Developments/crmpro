"use client";

import {
  IconBrandWhatsapp,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconFileText,
  IconFlame,
  IconMail,
  IconMapPin,
  IconMessage,
  IconPhone,
  IconSnowflake,
  IconSun,
  IconUsers,
  IconVideo,
  type Icon,
} from "@tabler/icons-react";
import type {
  InteractionChannel,
  LeadHeat,
  TaskType,
} from "@/features/leads/types";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";

export const CHANNEL_ICONS: Record<InteractionChannel, Icon> = {
  CALL: IconPhone,
  WHATSAPP: IconBrandWhatsapp,
  MEETING: IconUsers,
  SITE_VISIT: IconMapPin,
  VIDEO_CALL: IconVideo,
  EMAIL: IconMail,
  SMS: IconMessage,
};

export const TASK_TYPE_ICONS: Record<TaskType, Icon> = {
  CALL: IconPhone,
  WHATSAPP: IconBrandWhatsapp,
  MEETING: IconUsers,
  SITE_VISIT: IconMapPin,
  SEND_OFFER: IconFileText,
  PAPERWORK: IconFileText,
  REVIEW: IconBuildingCommunity,
  OTHER: IconCalendarEvent,
};

const HEAT_META: Record<LeadHeat, { label: string; icon: Icon; className: string }> = {
  HOT: {
    label: "Hot",
    icon: IconFlame,
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  WARM: {
    label: "Warm",
    icon: IconSun,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  COLD: {
    label: "Cold",
    icon: IconSnowflake,
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
};

export function HeatBadge({
  heat,
  compact = false,
  className,
}: {
  heat: LeadHeat;
  compact?: boolean;
  className?: string;
}) {
  const meta = HEAT_META[heat];
  const Icon = meta.icon;
  return (
    <span
      title={`${meta.label} lead`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-medium",
        compact ? "size-5 justify-center" : "h-5 px-1.5 text-[10px]",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3" stroke={2} />
      {compact ? null : meta.label}
    </span>
  );
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Today 14:00", "Tomorrow 11:00", "Thu 20 Nov 12:00", or "2h overdue". */
export function formatDue(dueAt: string | Date, now = new Date()): string {
  const due = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  const diff = due.getTime() - now.getTime();
  if (diff < 0) {
    const late = -diff;
    if (late < HOUR) return `${Math.max(1, Math.round(late / MINUTE))}m overdue`;
    if (late < 24 * HOUR) return `${Math.round(late / HOUR)}h overdue`;
    return `${Math.round(late / (24 * HOUR))}d overdue`;
  }
  if (diff < HOUR) return `In ${Math.max(1, Math.round(diff / MINUTE))}m`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (sameDay(due, now)) return `Today ${timeFormat.format(due)}`;
  if (sameDay(due, tomorrow)) return `Tomorrow ${timeFormat.format(due)}`;
  return `${dayFormat.format(due)} ${timeFormat.format(due)}`;
}

/** Next-step cell: overdue in red, none in amber, otherwise the due time. */
export function NextStepLabel({
  nextTaskDueAt,
  isClosed,
  className,
}: {
  nextTaskDueAt: string | null;
  isClosed: boolean;
  className?: string;
}) {
  if (isClosed) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }
  if (!nextTaskDueAt) {
    return (
      <span className={cn("font-medium text-amber-700 dark:text-amber-400", className)}>
        No next step
      </span>
    );
  }
  return <NextStepDue dueAt={nextTaskDueAt} className={className} />;
}

function NextStepDue({ dueAt, className }: { dueAt: string; className?: string }) {
  const now = useNow();
  const overdue = new Date(dueAt).getTime() < now;
  return (
    <span
      className={cn(
        "tabular-nums",
        overdue ? "font-medium text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {formatDue(dueAt, new Date(now))}
    </span>
  );
}

/** Value for <input type="datetime-local"> in the browser's zone. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
