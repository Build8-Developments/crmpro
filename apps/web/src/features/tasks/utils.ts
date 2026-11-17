import type { TaskType } from "./types";
import { AppIcons } from "@/components/icons/app-icons";

/** Local end-of-day / end-of-week (6 days later) for the Today summary. */
export function localDayBounds(now = new Date()) {
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return { todayEnd, weekEnd };
}

/** Quick picks for "next follow-up". Times land on the next working hour. */
export function quickDueDate(
  preset: "laterToday" | "tomorrow" | "in3Days" | "nextWeek",
  now = new Date(),
): Date {
  const date = new Date(now);
  switch (preset) {
    case "laterToday":
      date.setHours(date.getHours() + 3, 0, 0, 0);
      return date;
    case "tomorrow":
      date.setDate(date.getDate() + 1);
      break;
    case "in3Days":
      date.setDate(date.getDate() + 3);
      break;
    case "nextWeek":
      date.setDate(date.getDate() + 7);
      break;
  }
  date.setHours(11, 0, 0, 0);
  return date;
}

/** `<input type="datetime-local">` value for a Date, in local time. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const TASK_TYPE_ICONS: Record<TaskType, typeof AppIcons.user> = {
  CALL: AppIcons.phone,
  WHATSAPP: AppIcons.message,
  MEETING: AppIcons.users,
  SITE_VISIT: AppIcons.building,
  EMAIL: AppIcons.mail,
  FOLLOW_UP: AppIcons.clock,
  OTHER: AppIcons.check,
};

export const TASK_TYPES: TaskType[] = [
  "CALL",
  "WHATSAPP",
  "MEETING",
  "SITE_VISIT",
  "EMAIL",
  "FOLLOW_UP",
  "OTHER",
];

/**
 * Due date for humans: "today, 14:30" / "tomorrow, 11:00" / "Thu 20 Nov, 11:00".
 * Uses Intl so it follows the active locale.
 */
export function formatDueDate(isoDate: string, locale?: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(date) - startOfDay(now)) / 86_400_000,
  );
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (Math.abs(dayDiff) <= 1) {
    const day = new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      dayDiff,
      "day",
    );
    return `${day}, ${time}`;
  }

  const day = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return `${day}, ${time}`;
}

/** True when a due date has passed (evaluated when called). */
export function isPastDue(isoDate: string | null): boolean {
  return isoDate !== null && new Date(isoDate).getTime() < Date.now();
}
