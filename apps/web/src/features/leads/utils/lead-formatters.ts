import type { Lead } from "@/features/leads/types";
import { formatRelativeTime } from "@/lib/format";

const STALE_CONTACT_DAYS = 7;

export function getPrimaryProjectInterest(lead: Lead) {
  return lead.projectInterests[0] ?? null;
}

export function isStaleContact(lastContactedAt: string | null): boolean {
  if (!lastContactedAt) return true;

  const contacted = new Date(lastContactedAt);
  const now = new Date();
  const diffDays =
    (now.getTime() - contacted.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= STALE_CONTACT_DAYS;
}

export function formatLastContacted(lastContactedAt: string | null): string {
  if (!lastContactedAt) return "Never";
  return formatRelativeTime(lastContactedAt);
}


export function paginationRangeLabel(
  page: number,
  limit: number,
  totalItems: number,
): string {
  if (totalItems === 0) return "Showing 0 leads";

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);
  return `Showing ${start}–${end} of ${totalItems.toLocaleString()} leads`;
}
