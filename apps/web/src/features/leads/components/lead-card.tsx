"use client";

import { useState } from "react";
import { IconBrandWhatsapp, IconLoader2, IconPhone } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/features/leads/types";
import {
  formatBudget,
  formatLastContacted,
  getPrimaryProjectInterest,
  isStaleContact,
} from "@/features/leads/utils/lead-formatters";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { cn } from "@/lib/utils";
import { LeadStageBadge } from "./lead-status-badge";
import { LeadAssigneeCell } from "./leads-table-cells";
import { runContactAction } from "./masked-contact";
import { HeatBadge, NextStepLabel } from "./workflow-visuals";

/**
 * A lead on phones (the list below `md`). Tapping it opens the drawer, like
 * the name in the table. Call / WhatsApp fetch the number through the logged
 * contact-access endpoint — the card never holds the real number.
 */
export function LeadCard({ lead }: { lead: Lead }) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const archived = lead.status === "ARCHIVED";
  const closed = lead.stage.isClosed || archived;
  const interest = getPrimaryProjectInterest(lead);
  const budget = formatBudget(lead.budgetMin, lead.budgetMax);
  const stale = isStaleContact(lead.lastContactedAt);

  return (
    // The whole card is a tap target; keyboard users get the name button.
    <div
      className="cursor-pointer px-4 py-3.5 transition-colors duration-fast ease-enter active:bg-accent/60"
      onClick={() => openDrawer(lead.id)}
    >
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="flex min-h-11 w-full min-w-0 flex-col justify-center text-left"
            onClick={(event) => {
              event.stopPropagation();
              openDrawer(lead.id);
            }}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-medium text-foreground">{lead.fullName}</span>
              {closed ? null : <HeatBadge heat={lead.heat} compact />}
            </span>
            {interest ? (
              <span className="mt-0.5 truncate text-xs text-muted-foreground">
                {interest.project.name}
                {lead.projectInterests.length > 1 ? ` +${lead.projectInterests.length - 1}` : ""}
              </span>
            ) : null}
          </button>
        </div>
        <div className="flex min-h-11 shrink-0 items-center">
          <LeadStageBadge stage={lead.stage} archived={archived} size="xs" />
        </div>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <CardField label="Next step">
          <NextStepLabel nextTaskDueAt={lead.nextTaskDueAt} isClosed={closed} />
        </CardField>
        <CardField label="Last contact">
          <span
            className={cn(
              "tabular-nums",
              stale ? "font-medium text-amber-700 dark:text-amber-400" : "text-foreground",
            )}
          >
            {formatLastContacted(lead.lastContactedAt)}
          </span>
        </CardField>
        <CardField label="Agent">
          <LeadAssigneeCell assignee={lead.assignee} />
        </CardField>
        <CardField label="Budget">
          {budget ? (
            <span className="text-foreground">{budget}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </CardField>
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ContactButton leadId={lead.id} action="CALL" />
        <ContactButton leadId={lead.id} action="WHATSAPP" />
      </div>
    </div>
  );
}

function CardField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate">{children}</dd>
    </div>
  );
}

const CONTACT_ACTIONS = {
  CALL: { label: "Call", icon: IconPhone },
  WHATSAPP: { label: "WhatsApp", icon: IconBrandWhatsapp },
} as const;

function ContactButton({ leadId, action }: { leadId: string; action: "CALL" | "WHATSAPP" }) {
  const [pending, setPending] = useState(false);
  const { label, icon: Icon } = CONTACT_ACTIONS[action];

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 gap-2 text-sm"
      disabled={pending}
      title={`${label} (logged)`}
      onClick={(event) => {
        event.stopPropagation();
        setPending(true);
        void runContactAction(leadId, "primaryPhone", action).finally(() => setPending(false));
      }}
    >
      {pending ? <IconLoader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {label}
    </Button>
  );
}
