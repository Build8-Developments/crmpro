"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { useLogLeadActivity } from "@/features/leads/mutations";
import type {
  InteractionOutcome,
  InteractionType,
} from "@/features/leads/types";
import { FollowUpPicker } from "@/features/tasks/components/follow-up-picker";
import { TaskTypeSelect } from "@/features/tasks/components/task-type-select";
import type { TaskType } from "@/features/tasks/types";
import { quickDueDate, toDateTimeLocalValue } from "@/features/tasks/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const OUTCOMES: InteractionOutcome[] = [
  "ANSWERED",
  "NO_ANSWER",
  "BUSY",
  "INTERESTED",
  "NOT_INTERESTED",
  "CALLBACK_REQUESTED",
  "WRONG_NUMBER",
  "OTHER",
];

/** Sensible default for the follow-up after each outcome. */
function defaultNextFollowUp(outcome: InteractionOutcome | null): Date | null {
  switch (outcome) {
    case "NO_ANSWER":
    case "BUSY":
      return quickDueDate("laterToday");
    case "CALLBACK_REQUESTED":
    case "ANSWERED":
    case "INTERESTED":
      return quickDueDate("tomorrow");
    case "NOT_INTERESTED":
    case "WRONG_NUMBER":
      return null;
    default:
      return quickDueDate("in3Days");
  }
}

interface LogActivityDialogProps {
  lead: { id: string; fullName: string } | null;
  type: InteractionType | null;
  onClose: () => void;
}

export function LogActivityDialog({ lead, type, onClose }: LogActivityDialogProps) {
  const t = useTranslations("activity");
  const open = lead !== null && type !== null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type ? t("log.title", { type: t(`types.${type}`) }) : null}
          </DialogTitle>
          <DialogDescription>
            {lead ? t("log.description", { name: lead.fullName }) : null}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <LogActivityForm
            key={`${lead.id}-${type}`}
            leadId={lead.id}
            type={type}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LogActivityForm({
  leadId,
  type,
  onClose,
}: {
  leadId: string;
  type: InteractionType;
  onClose: () => void;
}) {
  const t = useTranslations("activity");
  const tCommon = useTranslations("common");
  const { can } = usePermissions();
  const logActivity = useLogLeadActivity(leadId);
  const [outcome, setOutcome] = useState<InteractionOutcome | null>(null);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [nextDueAt, setNextDueAt] = useState<Date | null>(() =>
    defaultNextFollowUp(null),
  );
  const [nextType, setNextType] = useState<TaskType>("CALL");
  const canSchedule = can("task.create");

  const pickOutcome = (value: InteractionOutcome) => {
    setOutcome(value);
    setNextDueAt(defaultNextFollowUp(value));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const durationMinutes = Number(minutes);
    try {
      await logActivity.mutateAsync({
        type,
        ...(outcome ? { outcome } : {}),
        ...(minutes && Number.isFinite(durationMinutes)
          ? { durationSeconds: Math.round(durationMinutes * 60) }
          : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        occurredAt: occurredAt.toISOString(),
        ...(canSchedule && nextDueAt
          ? { nextFollowUp: { dueAt: nextDueAt.toISOString(), type: nextType } }
          : {}),
      });
      onClose();
    } catch {
      // toast shown by useApiMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("log.outcome")}</Label>
        <div className="flex flex-wrap gap-1.5">
          {OUTCOMES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => pickOutcome(value)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                outcome === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {t(`outcomes.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="activity-when">{t("log.occurredAt")}</Label>
          <Input
            id="activity-when"
            type="datetime-local"
            value={toDateTimeLocalValue(occurredAt)}
            max={toDateTimeLocalValue(new Date())}
            onChange={(event) => {
              const next = new Date(event.target.value);
              if (!Number.isNaN(next.getTime())) setOccurredAt(next);
            }}
            className="h-9 text-sm"
          />
        </div>
        {type === "CALL" ? (
          <div className="space-y-2">
            <Label htmlFor="activity-duration">{t("log.duration")}</Label>
            <Input
              id="activity-duration"
              type="number"
              min={0}
              step={0.5}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              className="h-9 text-sm"
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="activity-note">{t("log.note")}</Label>
        <textarea
          id="activity-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("log.notePlaceholder")}
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {canSchedule ? (
        <div className="space-y-2">
          <Label>{t("log.nextFollowUp")}</Label>
          <FollowUpPicker
            value={nextDueAt}
            onChange={setNextDueAt}
            allowNone
            noneLabel={t("log.noFollowUp")}
          />
          {nextDueAt ? (
            <TaskTypeSelect value={nextType} onChange={setNextType} />
          ) : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={logActivity.isPending}>
          {logActivity.isPending ? t("log.saving") : t("log.submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
