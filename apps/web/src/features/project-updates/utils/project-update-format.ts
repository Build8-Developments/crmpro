import type { ProjectUpdate, ProjectUpdateType } from "../types";

export const PROJECT_UPDATE_TYPE_LABELS: Record<ProjectUpdateType, string> = {
  PRICE_CHANGE: "Price change",
  NEW_PHASE: "New phase",
  AVAILABILITY: "Availability",
  GENERAL: "General",
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now", "5m ago", "3h ago", "2d ago", then a date. Pure: pass `now`. */
export function formatUpdateAge(isoDate: string, now: number): string {
  const time = new Date(isoDate).getTime();
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: diff > 300 * DAY ? "numeric" : undefined,
  }).format(new Date(time));
}

/** Edited after posting (soft-deleted rows never reach the client). */
export function isEdited(update: Pick<ProjectUpdate, "createdAt" | "updatedAt">): boolean {
  return new Date(update.updatedAt).getTime() - new Date(update.createdAt).getTime() > 1000;
}
