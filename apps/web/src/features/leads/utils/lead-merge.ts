import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_TIME_LABELS,
  PAYMENT_PREFERENCE_LABELS,
  PURCHASE_PURPOSE_LABELS,
  type LeadMergeField,
} from "@crmpro/shared";
import type { Lead, LeadMergeCounts } from "@/features/leads/types";
import { formatBudget } from "@/features/leads/utils/lead-formatters";

export const MERGE_FIELD_LABELS: Record<LeadMergeField, string> = {
  fullName: "Name",
  email: "Email",
  source: "Source",
  budget: "Budget",
  occupation: "Occupation",
  residenceArea: "Lives in",
  paymentPreference: "Payment",
  contactChannelPreference: "Preferred channel",
  contactTimePreference: "Best time",
  purchasePurpose: "Buying for",
  assignee: "Owner",
};

/** How one mergeable field reads on a lead (contacts stay masked). */
export function formatMergeFieldValue(
  lead: Lead,
  field: LeadMergeField,
  currency = "EGP",
): string | null {
  switch (field) {
    case "fullName":
      return lead.fullName;
    case "email":
      return lead.email;
    case "source":
      return lead.source?.name ?? null;
    case "budget":
      return formatBudget(lead.budgetMin, lead.budgetMax, currency);
    case "occupation":
      return lead.occupation;
    case "residenceArea":
      return lead.residenceArea;
    case "paymentPreference":
      return lead.paymentPreference ? PAYMENT_PREFERENCE_LABELS[lead.paymentPreference] : null;
    case "contactChannelPreference":
      return lead.contactChannelPreference
        ? CONTACT_CHANNEL_LABELS[lead.contactChannelPreference]
        : null;
    case "contactTimePreference":
      return lead.contactTimePreference ? CONTACT_TIME_LABELS[lead.contactTimePreference] : null;
    case "purchasePurpose":
      return lead.purchasePurpose ? PURCHASE_PURPOSE_LABELS[lead.purchasePurpose] : null;
    case "assignee":
      return lead.assignee?.name ?? null;
  }
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "4 interactions, 2 tasks, 1 note, 3 files" — zero counts are left out. */
export function formatMergeCounts(counts: Partial<LeadMergeCounts>): string | null {
  const parts = [
    counts.interactions ? plural(counts.interactions, "interaction") : null,
    counts.tasks ? plural(counts.tasks, "task") : null,
    counts.notes ? plural(counts.notes, "note") : null,
    counts.files ? plural(counts.files, "file") : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** The older lead survives by default (it carries the longest history). */
export function isOlderLead(a: Lead, b: Lead): boolean {
  return Date.parse(a.createdAt) <= Date.parse(b.createdAt);
}
