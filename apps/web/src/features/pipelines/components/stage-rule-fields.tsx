"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Day thresholds as typed; "" = the rule is off for the stage. */
export interface StageRuleDraft {
  staleAfterDays: string;
  stuckAfterDays: string;
}

export const STAGE_RULE_DAYS_MAX = 365;

const toText = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export function stageRuleDraft(stage?: {
  staleAfterDays: number | null;
  stuckAfterDays: number | null;
}): StageRuleDraft {
  return {
    staleAfterDays: toText(stage?.staleAfterDays),
    stuckAfterDays: toText(stage?.stuckAfterDays),
  };
}

function toDays(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

/** First problem with the thresholds, or null. */
export function stageRuleError(draft: StageRuleDraft): string | null {
  for (const value of [draft.staleAfterDays, draft.stuckAfterDays]) {
    const days = toDays(value);
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > STAGE_RULE_DAYS_MAX)) {
      return `Use whole days from 1 to ${STAGE_RULE_DAYS_MAX}, or leave it blank`;
    }
  }
  return null;
}

/** Draft → API fields (blank = null = rule off). */
export function stageRuleInput(draft: StageRuleDraft): {
  staleAfterDays: number | null;
  stuckAfterDays: number | null;
} {
  return {
    staleAfterDays: toDays(draft.staleAfterDays),
    stuckAfterDays: toDays(draft.stuckAfterDays),
  };
}

/**
 * Follow-up rules of an open stage: R8 revive call after N days without
 * contact, R9 manager review after N days in the stage. Blank = off.
 */
export function StageRuleFields({
  value,
  onChange,
}: {
  value: StageRuleDraft;
  onChange: (next: StageRuleDraft) => void;
}) {
  const id = useId();
  const set = (key: keyof StageRuleDraft) => (next: string) =>
    onChange({ ...value, [key]: next.replace(/\D/g, "").slice(0, 3) });
  const error = stageRuleError(value);

  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Follow-up rules
      </legend>
      <RuleRow
        id={`${id}-stale`}
        label="Revive after"
        hint="Revive after N days without contact"
        value={value.staleAfterDays}
        onChange={set("staleAfterDays")}
      />
      <RuleRow
        id={`${id}-stuck`}
        label="Manager review after"
        hint="Flag for manager review after N days in stage"
        value={value.stuckAfterDays}
        onChange={set("stuckAfterDays")}
      />
      <p className="text-xs text-muted-foreground">Leave blank to turn a rule off.</p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}

function RuleRow({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <Label htmlFor={id}>{label}</Label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Input
          id={id}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Off"
          aria-describedby={`${id}-hint`}
          className="h-8 w-16 text-right tabular-nums"
        />
        <span className="text-xs text-muted-foreground">days</span>
      </div>
    </div>
  );
}
