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

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** "2M – 3.5M EGP", "From 2M EGP", "Up to 3M EGP", or null when unknown. */
export function formatBudget(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    return `${compactNumber.format(min)} – ${compactNumber.format(max)} EGP`;
  }
  return min !== null
    ? `From ${compactNumber.format(min)} EGP`
    : `Up to ${compactNumber.format(max!)} EGP`;
}
