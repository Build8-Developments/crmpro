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
import { Label } from "@/components/ui/label";
import { useCompleteTask } from "@/features/tasks/mutations";
import type { Task, TaskType } from "@/features/tasks/types";
import { FollowUpPicker } from "./follow-up-picker";
import { TaskTypeSelect } from "./task-type-select";

export function CompleteTaskDialog({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const t = useTranslations("tasks.complete");

  return (
    <Dialog open={task !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {task?.title}
            {task?.lead ? ` · ${task.lead.fullName}` : ""}
          </DialogDescription>
        </DialogHeader>
        {task ? <CompleteTaskForm task={task} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CompleteTaskForm({ task, onClose }: { task: Task; onClose: () => void }) {
  const t = useTranslations("tasks.complete");
  const tCommon = useTranslations("common");
  const completeTask = useCompleteTask();
  const [note, setNote] = useState("");
  const [nextDueAt, setNextDueAt] = useState<Date | null>(null);
  const [nextType, setNextType] = useState<TaskType>("CALL");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await completeTask.mutateAsync({
        id: task.id,
        input: {
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(nextDueAt && task.lead
            ? { nextFollowUp: { dueAt: nextDueAt.toISOString(), type: nextType } }
            : {}),
        },
      });
      onClose();
    } catch {
      // toast shown by useApiMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-note">{t("note")}</Label>
        <textarea
          id="task-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      {task.lead ? (
        <div className="space-y-2">
          <Label>{t("next")}</Label>
          <FollowUpPicker
            value={nextDueAt}
            onChange={setNextDueAt}
            allowNone
            noneLabel={t("none")}
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
        <Button type="submit" disabled={completeTask.isPending}>
          {completeTask.isPending ? t("submitting") : t("submit")}
        </Button>
      </DialogFooter>
    </form>
  );
}
