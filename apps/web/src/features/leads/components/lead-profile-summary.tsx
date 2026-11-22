"use client";

import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_TIME_LABELS,
  PAYMENT_PREFERENCE_LABELS,
  PURCHASE_PURPOSE_LABELS,
} from "@crmpro/shared";
import type { Lead } from "@/features/leads/types";
import { formatBudget } from "@/features/leads/utils/lead-formatters";

/** What the agent should know before calling: who they are and what they want. */
export function LeadProfileSummary({ lead }: { lead: Lead }) {
  const rows: Array<[string, string | null]> = [
    ["Job", lead.occupation],
    ["Lives in", lead.residenceArea],
    ["Buying to", lead.purchasePurpose ? PURCHASE_PURPOSE_LABELS[lead.purchasePurpose] : null],
    ["Budget", formatBudget(lead.budgetMin, lead.budgetMax)],
    ["Pays by", lead.paymentPreference ? PAYMENT_PREFERENCE_LABELS[lead.paymentPreference] : null],
    [
      "Reach by",
      [
        lead.contactChannelPreference ? CONTACT_CHANNEL_LABELS[lead.contactChannelPreference] : null,
        lead.contactTimePreference ? CONTACT_TIME_LABELS[lead.contactTimePreference] : null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    ],
  ];
  const filled = rows.filter(([, value]) => value);

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Client profile
      </h3>
      {filled.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
          No profile yet — add job, area, budget and how they like to be reached from Edit.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg border bg-card p-3 text-sm">
          {filled.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{label}</dt>
              <dd className="truncate">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
