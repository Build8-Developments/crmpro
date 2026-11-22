import {
  IconBolt,
  IconCalendarCheck,
  IconCash,
  IconFlame,
  IconHeartHandshake,
  IconTarget,
  IconTrophy,
  type Icon,
} from "@tabler/icons-react";
import type { AchievementKey, AchievementUnit } from "@crmpro/shared/achievements";
import { formatCompactMoney } from "@/features/targets/utils/target-format";
import { formatNumber } from "@/lib/format";

export const BADGE_ICONS: Record<AchievementKey, Icon> = {
  deals: IconTrophy,
  revenue: IconCash,
  speed_demon: IconBolt,
  zero_overdue_week: IconCalendarCheck,
  streak: IconFlame,
  referral_magnet: IconHeartHandshake,
  closer: IconTarget,
};

/** A badge value in its unit: "12", "4.5M EGP", "27%". */
export function formatBadgeValue(unit: AchievementUnit, value: number, currency: string): string {
  if (unit === "money") return formatCompactMoney(value, currency);
  if (unit === "percent") return `${Math.round(value * 10) / 10}%`;
  return formatNumber(value);
}

/** "12 Nov 2026" for an instant, in the workspace time zone. */
export function formatDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

/** "Week of 14 Nov" from a local YYYY-MM-DD (a label, no zone shift). */
export function formatWeekOf(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const label = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
  return `Week of ${label}`;
}

/** "Mar 2025" for the "since" line. */
export function formatMonthYear(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric", timeZone }).format(
    new Date(iso),
  );
}
