"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { quickDueDate, toDateTimeLocalValue } from "@/features/tasks/utils";

const PRESETS = ["laterToday", "tomorrow", "in3Days", "nextWeek"] as const;
type Preset = (typeof PRESETS)[number];

interface FollowUpPickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  /** Show a "None" chip (optional follow-up). */
  allowNone?: boolean;
  noneLabel?: string;
}

/**
 * One-tap due dates ("Tomorrow", "In 3 days", …) plus an exact
 * date-time input. Agents mostly use the chips.
 */
export function FollowUpPicker({
  value,
  onChange,
  allowNone = false,
  noneLabel,
}: FollowUpPickerProps) {
  const t = useTranslations("tasks.quick");

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs transition-colors",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    );

  const isPreset = (preset: Preset) =>
    value !== null &&
    Math.abs(value.getTime() - quickDueDate(preset).getTime()) < 60_000;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {allowNone ? (
          <button
            type="button"
            className={chip(value === null)}
            onClick={() => onChange(null)}
          >
            {noneLabel}
          </button>
        ) : null}
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={chip(isPreset(preset))}
            onClick={() => onChange(quickDueDate(preset))}
          >
            {t(preset)}
          </button>
        ))}
      </div>
      {value !== null ? (
        <Input
          type="datetime-local"
          value={toDateTimeLocalValue(value)}
          onChange={(event) => {
            const next = new Date(event.target.value);
            if (!Number.isNaN(next.getTime())) onChange(next);
          }}
          className="h-9 text-sm"
        />
      ) : null}
    </div>
  );
}
