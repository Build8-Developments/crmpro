"use client";

import { useState } from "react";
import { addWorkingMinutes, type WorkSchedule } from "@crmpro/shared";
import { SettingsSection } from "@/components/crm/settings-section";
import { SettingsPageBody } from "@/components/crm/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOrganization,
  useUpdateOrganizationSettings,
} from "@/features/organization/hooks";
import type {
  LeaderboardMode,
  OrganizationSettings,
  UpdateOrganizationSettingsInput,
} from "@/features/organization/types";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLA_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const ESCALATE_OPTIONS = [15, 20, 30, 45, 60, 90, 120, 180, 240];

const LEADERBOARD_MODES: ReadonlyArray<{ value: LeaderboardMode; label: string; hint: string }> = [
  {
    value: "TARGET_PERCENT",
    label: "% of target (recommended)",
    hint: "Positions and how much of their own targets each person reached. No money is shown.",
  },
  { value: "RANK_ONLY", label: "Positions only", hint: "Who is 1st, 2nd and 3rd, with no figures." },
  {
    value: "FULL",
    label: "Full figures",
    hint: "Positions with each person's contracted revenue and deals this month.",
  },
  { value: "OFF", label: "Off", hint: "Agents don't see a leaderboard." },
];

type Draft = Pick<
  OrganizationSettings,
  | "workingDays"
  | "workdayStartMinute"
  | "workdayEndMinute"
  | "firstContactSlaMinutes"
  | "escalateAfterMinutes"
  | "dailyInteractionGoal"
  | "leaderboardMode"
>;

function draftOf(settings: OrganizationSettings): Draft {
  return {
    workingDays: [...settings.workingDays].sort((a, b) => a - b),
    workdayStartMinute: settings.workdayStartMinute,
    workdayEndMinute: settings.workdayEndMinute,
    firstContactSlaMinutes: settings.firstContactSlaMinutes,
    escalateAfterMinutes: settings.escalateAfterMinutes,
    dailyInteractionGoal: settings.dailyInteractionGoal,
    leaderboardMode: settings.leaderboardMode,
  };
}

function toTime(minutes: number): string {
  const clamped = Math.min(minutes, 24 * 60 - 1);
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function fromTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Settings → Leads & sales → Workday & response times. The rules engine reads
 * these: SLA clocks only run in working hours, and Today aims for the goal.
 */
export function WorkdaySettingsPage() {
  const { data: organization, isLoading, isError, refetch } = useOrganization();
  const { can } = usePermissions();
  const canManage = can("settings.manage");

  return (
    <SettingsPageBody>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Workday &amp; response times</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          When your team works, how fast new leads must be called, and how much a good day is.
          The system plans and chases tasks with these.
        </p>
      </div>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !organization ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          Settings could not be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          {!canManage ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              You can view these settings. Ask your workspace owner to change them.
            </p>
          ) : null}
          <WorkdayForm
            // Fresh draft after every save.
            key={organization.settings.updatedAt}
            settings={organization.settings}
            canManage={canManage}
          />
        </>
      )}
    </SettingsPageBody>
  );
}

function WorkdayForm({
  settings,
  canManage,
}: {
  settings: OrganizationSettings;
  canManage: boolean;
}) {
  const saved = draftOf(settings);
  const [draft, setDraft] = useState<Draft>(saved);
  const update = useUpdateOrganizationSettings();

  const changes: UpdateOrganizationSettingsInput = {};
  for (const key of Object.keys(saved) as Array<keyof Draft>) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(saved[key])) {
      (changes as Record<string, unknown>)[key] = draft[key];
    }
  }
  const dirty = Object.keys(changes).length > 0;

  const problems: string[] = [];
  if (draft.workingDays.length === 0) problems.push("Pick at least one working day.");
  if (draft.workdayEndMinute - draft.workdayStartMinute < 60)
    problems.push("The workday must end at least an hour after it starts.");
  if (draft.escalateAfterMinutes <= draft.firstContactSlaMinutes)
    problems.push("Managers must be alerted after the first-call deadline, not before.");
  if (!Number.isInteger(draft.dailyInteractionGoal) || draft.dailyInteractionGoal < 1 || draft.dailyInteractionGoal > 200)
    problems.push("The daily goal must be between 1 and 200.");

  // Days in the order the week starts (Saturday first in Egypt).
  const dayOrder = Array.from({ length: 7 }, (_, i) => (settings.weekStartsOn + i) % 7);

  const toggleDay = (day: number) =>
    setDraft((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((d) => d !== day)
        : [...current.workingDays, day].sort((a, b) => a - b),
    }));

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (dirty && problems.length === 0) update.mutate(changes);
      }}
    >
      <SettingsSection
        title="Working hours"
        description={`Response-time clocks only run inside these hours (${settings.timezone.replace(/_/g, " ")}).`}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Working days</Label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Working days">
              {dayOrder.map((day) => {
                const on = draft.workingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={!canManage}
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-9 w-14 rounded-lg border text-sm font-medium transition-colors duration-fast disabled:cursor-not-allowed",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid max-w-sm grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="workday-start">Opens</Label>
              <Input
                id="workday-start"
                type="time"
                step={900}
                disabled={!canManage}
                value={toTime(draft.workdayStartMinute)}
                onChange={(event) => {
                  const value = fromTime(event.target.value);
                  if (value !== null) setDraft({ ...draft, workdayStartMinute: value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="workday-end">Closes</Label>
              <Input
                id="workday-end"
                type="time"
                step={900}
                disabled={!canManage}
                value={toTime(draft.workdayEndMinute)}
                onChange={(event) => {
                  const value = fromTime(event.target.value);
                  if (value !== null) setDraft({ ...draft, workdayEndMinute: value });
                }}
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="New-lead response time"
        description="Every newly assigned lead gets an urgent first call. Both times count working minutes only."
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MinutesChoice
              label="Call new leads within"
              value={draft.firstContactSlaMinutes}
              options={SLA_OPTIONS}
              disabled={!canManage}
              onChange={(value) => setDraft({ ...draft, firstContactSlaMinutes: value })}
            />
            <MinutesChoice
              label="Alert the manager after"
              value={draft.escalateAfterMinutes}
              options={ESCALATE_OPTIONS}
              disabled={!canManage}
              onChange={(value) => setDraft({ ...draft, escalateAfterMinutes: value })}
            />
          </div>
          <SlaExample draft={draft} timeZone={settings.timezone} />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Daily goal"
        description="Client touches (calls, WhatsApps, meetings, visits) per agent per day. Today suggests extra clients until the plan reaches it."
      >
        <div className="flex max-w-xs items-center gap-2">
          <Input
            type="number"
            min={1}
            max={200}
            disabled={!canManage}
            value={Number.isNaN(draft.dailyInteractionGoal) ? "" : draft.dailyInteractionGoal}
            onChange={(event) =>
              setDraft({ ...draft, dailyInteractionGoal: Number.parseInt(event.target.value, 10) })
            }
            className="w-24"
            aria-label="Daily goal"
          />
          <span className="text-sm text-muted-foreground">touches per agent</span>
        </div>
        <fieldset className="mt-5 max-w-xl" disabled={!canManage}>
          <legend className="text-sm font-medium">Team leaderboard for agents</legend>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Agents see the top 3 and their own rank on My performance. Anyone can choose to appear as
            &ldquo;A teammate&rdquo; in their account settings. Managers always see the team&apos;s real numbers
            on the dashboard.
          </p>
          <div className="mt-2 space-y-1.5">
            {LEADERBOARD_MODES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2",
                  draft.leaderboardMode === option.value
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="leaderboard-mode"
                  value={option.value}
                  checked={draft.leaderboardMode === option.value}
                  onChange={() => setDraft({ ...draft, leaderboardMode: option.value })}
                  className="mt-0.5 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </SettingsSection>

      {problems.length > 0 && dirty ? (
        <ul className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      ) : null}

      {canManage ? (
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!dirty || problems.length > 0 || update.isPending}>
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
          {dirty ? (
            <Button type="button" variant="ghost" onClick={() => setDraft(saved)}>
              Discard
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function MinutesChoice({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const choices = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1">
        {choices.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "h-8 min-w-12 rounded-md border px-2 text-xs font-medium tabular-nums transition-colors duration-fast disabled:cursor-not-allowed",
              value === option
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/60",
            )}
          >
            {option < 60 ? `${option}m` : option % 60 === 0 ? `${option / 60}h` : `${Math.floor(option / 60)}h ${option % 60}m`}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "A lead assigned now must be called by … / the manager hears at …". */
function SlaExample({ draft, timeZone }: { draft: Draft; timeZone: string }) {
  const now = useNow(60_000);
  if (draft.workingDays.length === 0 || draft.workdayEndMinute - draft.workdayStartMinute < 60) {
    return null;
  }
  const schedule: WorkSchedule = {
    timeZone,
    workingDays: draft.workingDays,
    startMinute: draft.workdayStartMinute,
    endMinute: draft.workdayEndMinute,
  };
  const from = new Date(now);
  const due = addWorkingMinutes(from, draft.firstContactSlaMinutes, schedule);
  const alert = addWorkingMinutes(from, draft.escalateAfterMinutes, schedule);
  const format = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  return (
    <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      Example: a lead assigned right now must be called by{" "}
      <span className="font-medium text-foreground">{format.format(due)}</span>; if not, its manager
      is alerted at <span className="font-medium text-foreground">{format.format(alert)}</span>.
    </p>
  );
}
