"use client";

import { SettingsSection } from "@/components/crm/settings-section";
import { Badge } from "@/components/ui/badge";
import type {
  ContractTerminationMode,
  OrganizationContract,
} from "@/features/organization/types";
import { formatMoney, formatNumber } from "@/lib/format";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Access ends at the end of a UTC day: show that day, not the local one. */
const utcDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  INSTAPAY: "Instapay",
  OTHER: "Other",
};

const PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Every 6 months",
  ANNUAL: "Yearly",
  CUSTOM: "Custom schedule",
};

const TERMINATION_MODE_LABELS: Record<ContractTerminationMode, string> = {
  FULL_ACCESS: "Full access until access ends",
  READ_ONLY: "Read-only until access ends",
  IMMEDIATE: "Suspended immediately",
};


function formatDate(value: string | null): string {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

/** The contract as signed: plan, money terms, dates and, if any, how it ended. */
export function ContractTermsSection({
  contract,
}: {
  contract: OrganizationContract | null;
}) {
  return (
    <SettingsSection
      title="Contract"
      description="The terms your workspace signed with Nomow"
    >
      {contract ? (
        <div className="space-y-3">
          {contract.termination ? (
            <TerminationNotice termination={contract.termination} />
          ) : null}
          <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-border/60 p-4 text-sm sm:grid-cols-2">
            <Term label="Plan as signed" value={contract.planName} />
            <Term
              label="Status"
              value={
                <Badge variant="outline" className="capitalize">
                  {contract.status.toLowerCase()}
                </Badge>
              }
            />
            {contract.pricing ? (
              <>
                <Term
                  label="Agreed price"
                  value={formatMoney(
                    contract.pricing.agreedPrice,
                    contract.pricing.currency,
                  )}
                />
                <Term
                  label="Payment"
                  value={`${PAYMENT_METHOD_LABELS[contract.pricing.paymentMethod] ?? contract.pricing.paymentMethod} · ${PAYMENT_FREQUENCY_LABELS[contract.pricing.paymentFrequency] ?? contract.pricing.paymentFrequency}`}
                />
              </>
            ) : null}
            <Term label="Starts" value={formatDate(contract.startsAt)} />
            <Term
              label="Ends"
              value={contract.endsAt ? formatDate(contract.endsAt) : "No end date"}
            />
            <Term
              label="Auto-renew"
              value={contract.autoRenew ? "Yes" : "No"}
            />
            <Term
              label="Grace period"
              value={
                contract.gracePeriodDays
                  ? `${formatNumber(contract.gracePeriodDays)} days`
                  : "None"
              }
            />
          </dl>
        </div>
      ) : (
        <p className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          No contract on file.
        </p>
      )}
    </SettingsSection>
  );
}

function TerminationNotice({
  termination,
}: {
  termination: NonNullable<OrganizationContract["termination"]>;
}) {
  const ends = termination.accessEndsAt
    ? utcDateFormatter.format(new Date(termination.accessEndsAt))
    : null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium text-foreground">
        Contract terminated
        {termination.terminatedAt
          ? ` on ${formatDate(termination.terminatedAt)}`
          : ""}
      </p>
      <p className="mt-1 text-muted-foreground">
        {termination.mode ? TERMINATION_MODE_LABELS[termination.mode] : "Ended"}
        {ends && termination.mode !== "IMMEDIATE"
          ? ` · access ends ${ends}`
          : ""}
      </p>
    </div>
  );
}

function Term({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
