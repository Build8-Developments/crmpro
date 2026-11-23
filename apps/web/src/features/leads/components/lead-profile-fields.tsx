"use client";

import { useWorkspaceCurrency } from "@/features/organization/hooks";
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_CHANNEL_PREFERENCES,
  CONTACT_TIME_LABELS,
  CONTACT_TIME_PREFERENCES,
  PAYMENT_PREFERENCE_LABELS,
  PAYMENT_PREFERENCES,
  PURCHASE_PURPOSE_LABELS,
  PURCHASE_PURPOSES,
} from "@crmpro/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Lead, LeadProfile } from "@/features/leads/types";

/** Form state: text inputs as strings, selects as "" for none. */
export interface LeadProfileDraft {
  occupation: string;
  residenceArea: string;
  paymentPreference: string;
  contactChannelPreference: string;
  contactTimePreference: string;
  purchasePurpose: string;
  budgetMin: string;
  budgetMax: string;
}

export const EMPTY_PROFILE_DRAFT: LeadProfileDraft = {
  occupation: "",
  residenceArea: "",
  paymentPreference: "",
  contactChannelPreference: "",
  contactTimePreference: "",
  purchasePurpose: "",
  budgetMin: "",
  budgetMax: "",
};

export function profileDraftFromLead(lead: Lead): LeadProfileDraft {
  return {
    occupation: lead.occupation ?? "",
    residenceArea: lead.residenceArea ?? "",
    paymentPreference: lead.paymentPreference ?? "",
    contactChannelPreference: lead.contactChannelPreference ?? "",
    contactTimePreference: lead.contactTimePreference ?? "",
    purchasePurpose: lead.purchasePurpose ?? "",
    budgetMin: lead.budgetMin !== null ? String(lead.budgetMin) : "",
    budgetMax: lead.budgetMax !== null ? String(lead.budgetMax) : "",
  };
}

function amount(value: string): number | null {
  const digits = value.replace(/[^\d.]/g, "");
  return digits ? Number(digits) : null;
}

/** Draft → API payload (blank = null, so edits can clear values). */
export function profileDraftToInput(draft: LeadProfileDraft): LeadProfile {
  return {
    occupation: draft.occupation.trim() || null,
    residenceArea: draft.residenceArea.trim() || null,
    paymentPreference: (draft.paymentPreference || null) as LeadProfile["paymentPreference"],
    contactChannelPreference: (draft.contactChannelPreference ||
      null) as LeadProfile["contactChannelPreference"],
    contactTimePreference: (draft.contactTimePreference ||
      null) as LeadProfile["contactTimePreference"],
    purchasePurpose: (draft.purchasePurpose || null) as LeadProfile["purchasePurpose"],
    budgetMin: amount(draft.budgetMin),
    budgetMax: amount(draft.budgetMax),
  };
}

export function profileBudgetError(draft: LeadProfileDraft): string | null {
  const min = amount(draft.budgetMin);
  const max = amount(draft.budgetMax);
  return min !== null && max !== null && min > max ? "Minimum is above the maximum" : null;
}

const NONE = "__none__";

function OptionSelect<T extends string>({
  label,
  value,
  values,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly T[];
  labels: Record<T, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not set</SelectItem>
          {values.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatAmountInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

/** The client-profile part of the lead form (create + edit). */
export function LeadProfileFields({
  value,
  onChange,
}: {
  value: LeadProfileDraft;
  onChange: (next: LeadProfileDraft) => void;
}) {
  const set = (key: keyof LeadProfileDraft) => (next: string) => onChange({ ...value, [key]: next });
  const budgetError = profileBudgetError(value);
  const currency = useWorkspaceCurrency();

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-occupation">Job</Label>
          <Input
            id="lead-occupation"
            value={value.occupation}
            onChange={(event) => set("occupation")(event.target.value)}
            placeholder="e.g. Engineer at Vodafone"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-residence">Lives in</Label>
          <Input
            id="lead-residence"
            value={value.residenceArea}
            onChange={(event) => set("residenceArea")(event.target.value)}
            placeholder="e.g. Nasr City, Cairo"
            maxLength={120}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          label="Buying to"
          value={value.purchasePurpose}
          values={PURCHASE_PURPOSES}
          labels={PURCHASE_PURPOSE_LABELS}
          onChange={set("purchasePurpose")}
        />
        <OptionSelect
          label="Pays by"
          value={value.paymentPreference}
          values={PAYMENT_PREFERENCES}
          labels={PAYMENT_PREFERENCE_LABELS}
          onChange={set("paymentPreference")}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Budget ({currency})</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            inputMode="numeric"
            placeholder="From"
            value={formatAmountInput(value.budgetMin)}
            onChange={(event) => set("budgetMin")(event.target.value)}
            aria-invalid={Boolean(budgetError)}
          />
          <Input
            inputMode="numeric"
            placeholder="To"
            value={formatAmountInput(value.budgetMax)}
            onChange={(event) => set("budgetMax")(event.target.value)}
            aria-invalid={Boolean(budgetError)}
          />
        </div>
        {budgetError ? <p className="text-xs text-destructive">{budgetError}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OptionSelect
          label="Prefers to be reached by"
          value={value.contactChannelPreference}
          values={CONTACT_CHANNEL_PREFERENCES}
          labels={CONTACT_CHANNEL_LABELS}
          onChange={set("contactChannelPreference")}
        />
        <OptionSelect
          label="Best time"
          value={value.contactTimePreference}
          values={CONTACT_TIME_PREFERENCES}
          labels={CONTACT_TIME_LABELS}
          onChange={set("contactTimePreference")}
        />
      </div>
    </div>
  );
}
