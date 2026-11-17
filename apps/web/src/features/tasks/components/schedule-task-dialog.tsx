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
import { useCreateTask } from "@/features/tasks/mutations";
import type { TaskType } from "@/features/tasks/types";
import { quickDueDate } from "@/features/tasks/utils";
import { FollowUpPicker } from "./follow-up-picker";
import { TaskTypeSelect } from "./task-type-select";

interface ScheduleTaskDialogProps {
  open: boolean;
  leadId: string;
  onClose: () => void;
}

export function ScheduleTaskDialog({
  open,
  leadId,
  onClose,
}: ScheduleTaskDialogProps) {
  const t = useTranslations("tasks.form");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open ? <ScheduleTaskForm leadId={leadId} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ScheduleTaskForm({
  leadId,
  onClose,
}: {
  leadId: string;
  onClose: () => void;
}) {
  const t = useTranslations("tasks.form");
  const tCommon = useTranslations("common");
  const createTask = useCreateTask();
  const [type, setType] = useState<TaskType>("CALL");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<Date | null>(() => quickDueDate("tomorrow"));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dueAt) return;
    try {
      await createTask.mutateAsync({
        leadId,
        type,
        dueAt: dueAt.toISOString(),
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      onClose();
    } catch {
      // toast shown by useApiMutation
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-type">{t("type")}</Label>
        <TaskTypeSelect id="task-type" value={type} onChange={setType} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-title">{t("titleLabel")}</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={160}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("dueAt")}</Label>
        <FollowUpPicker value={dueAt} onChange={setDueAt} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={!dueAt || createTask.isPending}>
          {createTask.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}
