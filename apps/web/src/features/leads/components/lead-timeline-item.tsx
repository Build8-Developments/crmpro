"use client";

import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { getActivityMeta } from "@/features/dashboard/activity-icons";
import type { LeadTimelineActivity } from "@/features/leads/types";
import { formatRelativeTime } from "@/lib/format";

const INTERACTION_ICONS: Partial<Record<string, typeof AppIcons.phone>> = {
  CALL_LOGGED: AppIcons.phone,
  WHATSAPP_LOGGED: AppIcons.whatsapp,
  EMAIL_LOGGED: AppIcons.mail,
  MEETING_LOGGED: AppIcons.users,
  SITE_VISIT_LOGGED: AppIcons.mapPin,
  TASK_CREATED: AppIcons.calendar,
  TASK_COMPLETED: AppIcons.done,
  TASK_CANCELLED: AppIcons.close,
  TASK_ASSIGNED: AppIcons.userPlus,
  STATUS_ARCHIVED: AppIcons.archive,
  STATUS_RESTORED: AppIcons.refresh,
};

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Timeline row: logged interactions and follow-ups show their details. */
export function LeadTimelineItem({ activity }: { activity: LeadTimelineActivity }) {
  const t = useTranslations("activity");
  const fallback = getActivityMeta(activity.eventType);
  const interactionIcon = INTERACTION_ICONS[activity.eventType];
  const Icon = interactionIcon ?? fallback.icon;
  const metadata =
    activity.metadata && typeof activity.metadata === "object"
      ? (activity.metadata as Record<string, unknown>)
      : {};

  const label = interactionIcon
    ? t(`timeline.${activity.eventType}` as "timeline.CALL_LOGGED")
    : fallback.label;
  const outcome = asText(metadata.outcome);
  const duration =
    typeof metadata.durationSeconds === "number" && metadata.durationSeconds > 0
      ? `${Math.max(1, Math.round(metadata.durationSeconds / 60))} min`
      : null;
  const detail = [
    outcome ? t(`outcomes.${outcome}` as "outcomes.ANSWERED") : null,
    duration,
    asText(metadata.title),
  ]
    .filter(Boolean)
    .join(" · ");
  const note = asText(metadata.note);

  return (
    <div className="flex items-start gap-2.5 rounded-lg border bg-card p-3">
      <div
        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
          interactionIcon ? "bg-primary/10 text-primary" : fallback.iconClassName
        }`}
      >
        <Icon className="size-3.5" stroke={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium">
          {label}
          {detail ? (
            <span className="font-normal text-muted-foreground"> · {detail}</span>
          ) : null}
        </p>
        {note ? (
          <p className="mt-1 whitespace-pre-wrap text-xs text-foreground/80">{note}</p>
        ) : null}
        <p className="text-[10px] text-muted-foreground">
          {activity.actor?.email ?? "System"} · {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
}
