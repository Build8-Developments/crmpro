"use client";

import { useState } from "react";
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
import { toDateTimeLocalValue } from "@/features/leads/components/workflow-visuals";
import { useCompleteTask, useRescheduleTask } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { InteractionChannel } from "@/features/leads/types";
import type { TodayTask } from "@/features/today/types";
import { cn } from "@/lib/utils";

/** Task types that are finished by contacting the client (= logging it). */
const CONTACT_CHANNEL: Partial<Record<TodayTask["type"], InteractionChannel>> = {
  CALL: "CALL",
  WHATSAPP: "WHATSAPP",
  MEETING: "MEETING",
  SITE_VISIT: "SITE_VISIT",
};

/** "Done": contact tasks open the log dialog pre-filled; others just close. */
export function useFinishTask() {
  const openLogDialog = useLeadUiStore((s) => s.openLogDialog);
  const completeTask = useCompleteTask();
  return (task: TodayTask, channel?: InteractionChannel) => {
    const logChannel = channel ?? CONTACT_CHANNEL[task.type];
    if (task.lead && logChannel) {
      openLogDialog({
        leadId: task.lead.id,
        leadName: task.lead.fullName,
        taskId: task.id,
        channel: logChannel,
      });
      return;
    }
    void completeTask.mutateAsync({ taskId: task.id });
  };
}

type SnoozePreset = "1h" | "3h" | "tomorrow" | "custom";

const PRESETS: Array<{ value: SnoozePreset; label: string }> = [
  { value: "1h", label: "In 1 hour" },
  { value: "3h", label: "In 3 hours" },
  { value: "tomorrow", label: "Tomorrow 11:00" },
  { value: "custom", label: "Pick a time" },
];

function presetDue(preset: SnoozePreset, custom: string): Date | null {
  const now = new Date();
  if (preset === "1h") return new Date(now.getTime() + 3_600_000);
  if (preset === "3h") return new Date(now.getTime() + 3 * 3_600_000);
  if (preset === "tomorrow") {
    const date = new Date(now);
    date.setDate(now.getDate() + 1);
    date.setHours(11, 0, 0, 0);
    return date;
  }
  return custom ? new Date(custom) : null;
}

/** Snooze = move later with a reason (snoozes are counted per agent). */
export function SnoozeDialog({
  task,
  onClose,
}: {
  task: TodayTask | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {task ? <SnoozeForm key={task.id} task={task} onDone={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SnoozeForm({ task, onDone }: { task: TodayTask; onDone: () => void }) {
  const reschedule = useRescheduleTask(task.lead?.id);
  const [preset, setPreset] = useState<SnoozePreset>("1h");
  const [custom, setCustom] = useState(() =>
    toDateTimeLocalValue(new Date(Date.now() + 2 * 3_600_000)),
  );
  const [reason, setReason] = useState("");
  const valid =
    reason.trim().length >= 3 && (preset !== "custom" || custom.length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // Resolved at submit time, not render, so "in 1 hour" means from now.
    const due = presetDue(preset, custom);
    if (!due || !valid) return;
    try {
      await reschedule.mutateAsync({
        taskId: task.id,
        dueAt: due.toISOString(),
        reason: reason.trim(),
      });
      onDone();
    } catch {
      // toast handled by the mutation
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Snooze “{task.title}”</DialogTitle>
        <DialogDescription>
          Moving work later needs a reason — your manager sees how often tasks are snoozed.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPreset(option.value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-fast",
              preset === option.value
                ? "border-primary bg-primary/5 font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-muted/50",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <Input
          type="datetime-local"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
        />
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="snooze-reason">Why later?</Label>
        <Input
          id="snooze-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Client asked to call after work"
          maxLength={200}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid || reschedule.isPending}>
          {reschedule.isPending ? "Moving…" : "Snooze"}
        </Button>
      </DialogFooter>
    </form>
  );
}
