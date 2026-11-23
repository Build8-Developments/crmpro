"use client";

import { useMemo, useState } from "react";
import {
  CHANNEL_LABELS,
  CLOSING_OUTCOMES,
  NEXT_STEP_DEFAULTS,
  OUTCOME_LABELS,
  OUTCOMES_BY_CHANNEL,
  requiresNextStep,
  resolveNextStepDueAt,
  TASK_TYPE_LABELS,
  TASK_TYPES,
  UNANSWERED_OUTCOMES,
  type InteractionChannel,
  type InteractionOutcome,
  type TaskType,
} from "@crmpro/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLead } from "@/features/leads/hooks";
import { useLogInteraction } from "@/features/leads/mutations";
import {
  useLeadUiStore,
  type LogDialogState,
} from "@/features/leads/stores/lead-ui-store";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { EvidencePicker, type EvidenceItem } from "./evidence-picker";
import { CHANNEL_ICONS, formatDue, toDateTimeLocalValue } from "./workflow-visuals";

/** Outcomes that usually come with paperwork worth keeping on the lead. */
const EVIDENCE_HINTS: Partial<Record<InteractionOutcome, string>> = {
  RESERVED: "Attach the reservation form, receipt or ID copy.",
  OFFER_SENT: "Attach the offer or payment plan you sent.",
  NEGOTIATING: "Attach the latest offer or counter-offer.",
  VISIT_DONE: "Attach photos or the unit layout from the visit.",
};

const PRIMARY_CHANNELS: InteractionChannel[] = ["CALL", "WHATSAPP", "MEETING", "SITE_VISIT"];
const MORE_CHANNELS: InteractionChannel[] = ["VIDEO_CALL", "EMAIL", "SMS"];

type DuePreset = "suggested" | "2h" | "tomorrow" | "3d" | "week" | "custom";

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo";
}

function presetDueAt(preset: Exclude<DuePreset, "custom">, outcome: InteractionOutcome | null) {
  const now = new Date();
  const tz = browserTimeZone();
  switch (preset) {
    case "suggested": {
      const suggestion = outcome ? NEXT_STEP_DEFAULTS[outcome] : undefined;
      return suggestion
        ? resolveNextStepDueAt(suggestion.offset, now, tz)
        : resolveNextStepDueAt({ kind: "dayAt", days: 1, hour: 11 }, now, tz);
    }
    case "2h":
      return resolveNextStepDueAt({ kind: "hours", hours: 2 }, now, tz);
    case "tomorrow":
      return resolveNextStepDueAt({ kind: "dayAt", days: 1, hour: 11 }, now, tz);
    case "3d":
      return resolveNextStepDueAt({ kind: "dayAt", days: 3, hour: 12 }, now, tz);
    case "week":
      return resolveNextStepDueAt({ kind: "dayAt", days: 7, hour: 12 }, now, tz);
  }
}

/**
 * Log a call / WhatsApp / meeting / visit and schedule the next step in one
 * go (workflow spec §4 item 5). The next step is required on open leads
 * unless the outcome ends the conversation.
 */
export function LogInteractionDialog() {
  const logDialog = useLeadUiStore((s) => s.logDialog);
  const closeLogDialog = useLeadUiStore((s) => s.closeLogDialog);

  return (
    <Dialog open={Boolean(logDialog)} onOpenChange={(open) => !open && closeLogDialog()}>
      <DialogContent className="sm:max-w-lg">
        {logDialog ? (
          <LogInteractionForm
            // Fresh form state for every lead/task the dialog opens for.
            key={`${logDialog.leadId}:${logDialog.taskId ?? ""}`}
            state={logDialog}
            onClose={closeLogDialog}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LogInteractionForm({
  state,
  onClose,
}: {
  state: LogDialogState;
  onClose: () => void;
}) {
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const { data: lead } = useLead(state.leadId);
  const logInteraction = useLogInteraction(state.leadId);
  const now = useNow(15_000);

  const [channel, setChannel] = useState<InteractionChannel>(state.channel ?? "CALL");
  const [outcome, setOutcome] = useState<InteractionOutcome | null>(null);
  const [note, setNote] = useState("");
  const [nextType, setNextType] = useState<TaskType>("CALL");
  const [nextTitle, setNextTitle] = useState("");
  const [preset, setPreset] = useState<DuePreset>("suggested");
  const [customDue, setCustomDue] = useState("");
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);

  /** Picking an outcome proposes the next step for it (spec §3.2). */
  const chooseOutcome = (value: InteractionOutcome) => {
    setOutcome(value);
    const suggestion = NEXT_STEP_DEFAULTS[value];
    setNextType(suggestion?.type ?? (channel === "WHATSAPP" ? "WHATSAPP" : "CALL"));
    setNextTitle(suggestion?.title ?? "");
    setPreset(suggestion?.askForTime ? "custom" : "suggested");
    if (suggestion?.askForTime) {
      setCustomDue(toDateTimeLocalValue(presetDueAt("suggested", value)));
    }
  };

  const leadClosed = lead?.stage.isClosed ?? false;
  const needsNextStep = Boolean(outcome) && !leadClosed && requiresNextStep(outcome!);
  const closingOutcome = outcome ? CLOSING_OUTCOMES.includes(outcome) : false;

  const dueAt = useMemo(() => {
    if (!needsNextStep) return null;
    if (preset === "custom") return customDue ? new Date(customDue) : null;
    return presetDueAt(preset, outcome);
    // `now` keeps relative presets ("in 2 hours") current while the form is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsNextStep, preset, customDue, outcome, now]);

  const dueInPast = dueAt ? dueAt.getTime() < now - 60_000 : false;
  const uploading = evidence.some((item) => item.status === "uploading");
  const evidenceHint = outcome ? EVIDENCE_HINTS[outcome] : undefined;
  const canSave =
    Boolean(outcome) &&
    (!needsNextStep || (dueAt !== null && !dueInPast)) &&
    !uploading &&
    !logInteraction.isPending;

  const handleSave = async () => {
    if (!outcome) return;
    try {
      await logInteraction.mutateAsync({
        channel,
        outcome,
        note: note.trim() || undefined,
        taskId: state.taskId,
        evidence: evidence
          .filter((item) => item.status === "ready" && item.objectKey)
          .map((item) => ({ objectKey: item.objectKey! })),
        nextStep:
          needsNextStep && dueAt
            ? {
                type: nextType,
                dueAt: dueAt.toISOString(),
                title: nextTitle.trim() || undefined,
              }
            : undefined,
      });
      onClose();
      if (closingOutcome && lead && !leadClosed) {
        // Not interested / wrong number → straight to closing it as Lost.
        openMoveStageDialog([lead.id], lead.pipeline.id);
      }
    } catch {
      // Error toast is handled by useApiMutation
    }
  };

  const outcomes = OUTCOMES_BY_CHANNEL[channel];

  return (
    <>
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>
            {state.leadName}
            {lead?.unansweredStreak ? ` · ${lead.unansweredStreak} unanswered in a row` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>How</Label>
            <div className="flex flex-wrap gap-1.5">
              {[...PRIMARY_CHANNELS, ...MORE_CHANNELS].map((value) => {
                const Icon = CHANNEL_ICONS[value];
                const active = channel === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setChannel(value);
                      if (outcome && !OUTCOMES_BY_CHANNEL[value].includes(outcome)) setOutcome(null);
                    }}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors duration-fast ease-enter",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {CHANNEL_LABELS[value]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>What happened</Label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {outcomes.map((value) => {
                const active = outcome === value;
                const unanswered = UNANSWERED_OUTCOMES.includes(value);
                const closing = CLOSING_OUTCOMES.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => chooseOutcome(value)}
                    className={cn(
                      "h-9 rounded-md border px-2 text-left text-xs font-medium transition-colors duration-fast ease-enter",
                      active
                        ? closing
                          ? "border-destructive bg-destructive text-white"
                          : "border-primary bg-primary text-primary-foreground"
                        : cn(
                            "bg-background hover:bg-muted",
                            unanswered && "text-muted-foreground",
                            closing && "text-destructive",
                          ),
                    )}
                  >
                    {OUTCOME_LABELS[value]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-note">Note (optional)</Label>
            <textarea
              id="log-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="What did they say? Budget, timing, objections…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] duration-fast ease-enter focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <EvidencePicker
            items={evidence}
            onChange={setEvidence}
            emphasize={Boolean(evidenceHint)}
            hint={evidenceHint}
          />

          {needsNextStep ? (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3 motion-safe:animate-slide-in [--slide:-4px]">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Next step</p>
                {dueAt ? (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      dueInPast ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {dueInPast ? "In the past" : formatDue(dueAt)}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-2">
                <Select value={nextType} onValueChange={(v) => setNextType(v as TaskType)}>
                  <SelectTrigger size="sm" className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.filter((t) => t !== "REVIEW").map((type) => (
                      <SelectItem key={type} value={type}>
                        {TASK_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={nextTitle}
                  onChange={(event) => setNextTitle(event.target.value)}
                  placeholder="What to do"
                  maxLength={200}
                  className="h-8 bg-background text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["suggested", "Suggested"],
                    ["2h", "In 2 hours"],
                    ["tomorrow", "Tomorrow 11:00"],
                    ["3d", "In 3 days"],
                    ["week", "Next week"],
                    ["custom", "Pick time"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPreset(value);
                      if (value === "custom" && !customDue) {
                        setCustomDue(toDateTimeLocalValue(presetDueAt("tomorrow", outcome)));
                      }
                    }}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors duration-fast ease-enter",
                      preset === value
                        ? "bg-foreground text-background"
                        : "bg-background text-muted-foreground ring-1 ring-border hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {preset === "custom" ? (
                <Input
                  type="datetime-local"
                  value={customDue}
                  onChange={(event) => setCustomDue(event.target.value)}
                  className="h-8 bg-background text-sm"
                />
              ) : null}
            </div>
          ) : closingOutcome && !leadClosed ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
              After saving you&apos;ll close this lead as Lost with a reason.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => void handleSave()}>
            {logInteraction.isPending ? "Saving…" : uploading ? "Uploading…" : "Save"}
          </Button>
        </DialogFooter>
    </>
  );
}
