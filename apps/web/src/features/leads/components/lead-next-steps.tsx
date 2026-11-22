"use client";

import { useState } from "react";
import { TASK_TYPE_LABELS } from "@crmpro/shared";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadTasks } from "@/features/leads/hooks";
import {
  useCompleteTask,
  useRescheduleTask,
  useSkipTask,
} from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { Lead, LeadTask } from "@/features/leads/types";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { formatDue, TASK_TYPE_ICONS, toDateTimeLocalValue } from "./workflow-visuals";

/** Tasks that are done by contacting the client — finishing them = logging it. */
const CONTACT_TASKS = new Set(["CALL", "WHATSAPP", "MEETING", "SITE_VISIT"]);

type TaskAction = { task: LeadTask; kind: "move" | "skip" } | null;

/**
 * "Next step" card in the lead drawer: what must happen next on this lead,
 * with one-tap Done / Move / Skip. An open lead with nothing scheduled is
 * called out — the system's whole promise is that this never stays empty.
 */
export function LeadNextSteps({ lead }: { lead: Lead }) {
  const { data: tasks, isLoading } = useLeadTasks(lead.id);
  const openLogDialog = useLeadUiStore((s) => s.openLogDialog);
  const completeTask = useCompleteTask(lead.id);
  const { can } = usePermissions();
  const [action, setAction] = useState<TaskAction>(null);

  const isOpen = lead.status === "OPEN" && !lead.stage.isClosed;
  if (!isOpen) return null;

  const items = tasks ?? [];
  const canWork = can("lead.update");

  const handleDone = (task: LeadTask) => {
    if (CONTACT_TASKS.has(task.type)) {
      openLogDialog({
        leadId: lead.id,
        leadName: lead.fullName,
        taskId: task.id,
        channel:
          task.type === "WHATSAPP"
            ? "WHATSAPP"
            : task.type === "MEETING"
              ? "MEETING"
              : task.type === "SITE_VISIT"
                ? "SITE_VISIT"
                : "CALL",
      });
      return;
    }
    void completeTask.mutateAsync({ taskId: task.id });
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Next step
        </h3>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : items.length === 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Nothing scheduled for this lead.
          </p>
          {canWork ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => openLogDialog({ leadId: lead.id, leadName: lead.fullName })}
            >
              Log &amp; plan
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((task) => {
            const Icon = TASK_TYPE_ICONS[task.type];
            return (
              <li
                key={task.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3",
                  task.isOverdue ? "border-destructive/30 bg-destructive/5" : "bg-card",
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md",
                    task.isOverdue
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      task.isOverdue ? "font-medium text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {formatDue(task.dueAt)} · {TASK_TYPE_LABELS[task.type]} · {task.assignee.name}
                    {task.snoozeCount > 0 ? ` · moved ${task.snoozeCount}×` : ""}
                  </p>
                </div>
                {canWork ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => handleDone(task)}>
                      Done
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setAction({ task, kind: "move" })}
                    >
                      Move
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => setAction({ task, kind: "skip" })}
                    >
                      Skip
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <TaskActionDialog leadId={lead.id} action={action} onClose={() => setAction(null)} />
    </section>
  );
}

function TaskActionDialog({
  leadId,
  action,
  onClose,
}: {
  leadId: string;
  action: TaskAction;
  onClose: () => void;
}) {
  const now = useNow();
  const reschedule = useRescheduleTask(leadId);
  const skip = useSkipTask(leadId);
  const [dueAt, setDueAt] = useState("");
  const [reason, setReason] = useState("");
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);

  // Initialise the form once per opened task.
  if (action && action.task.id !== lastTaskId) {
    setLastTaskId(action.task.id);
    setReason("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    setDueAt(toDateTimeLocalValue(tomorrow));
  }
  if (!action && lastTaskId !== null) setLastTaskId(null);

  const isMove = action?.kind === "move";
  const newDue = dueAt ? new Date(dueAt) : null;
  const isLater = Boolean(action && newDue && newDue.getTime() > new Date(action.task.dueAt).getTime());
  const reasonRequired = !isMove || isLater;
  const valid =
    (!isMove || (newDue !== null && newDue.getTime() > now)) &&
    (!reasonRequired || reason.trim().length >= 3);
  const pending = reschedule.isPending || skip.isPending;

  const handleSubmit = async () => {
    if (!action || !valid) return;
    try {
      if (isMove && newDue) {
        await reschedule.mutateAsync({
          taskId: action.task.id,
          dueAt: newDue.toISOString(),
          reason: reason.trim() || undefined,
        });
      } else {
        await skip.mutateAsync({ taskId: action.task.id, reason: reason.trim() });
      }
      onClose();
    } catch {
      // Error toast is handled by useApiMutation
    }
  };

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isMove ? "Move task" : "Skip task"}</DialogTitle>
          <DialogDescription>
            {action?.task.title}
            {isMove
              ? " — moving a task later counts as a snooze and needs a reason."
              : " — skipped tasks are visible to your manager."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isMove ? (
            <div className="space-y-1.5">
              <Label htmlFor="task-due">New time</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
          ) : null}
          {reasonRequired ? (
            <div className="space-y-1.5">
              <Label htmlFor="task-reason">Reason</Label>
              <Input
                id="task-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={isMove ? "e.g. Client travelling until Sunday" : "e.g. Already spoke today"}
                maxLength={300}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid || pending} onClick={() => void handleSubmit()}>
            {pending ? "Saving…" : isMove ? "Move" : "Skip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
