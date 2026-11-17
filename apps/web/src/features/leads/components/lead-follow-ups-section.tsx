"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { CompleteTaskDialog } from "@/features/tasks/components/complete-task-dialog";
import { ScheduleTaskDialog } from "@/features/tasks/components/schedule-task-dialog";
import { TaskItem } from "@/features/tasks/components/task-item";
import { useLeadOpenTasks } from "@/features/tasks/hooks";
import { useCancelTask } from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import { usePermissions } from "@/hooks/use-permissions";

export function LeadFollowUpsSection({
  leadId,
  leadOpen,
}: {
  leadId: string;
  leadOpen: boolean;
}) {
  const t = useTranslations("tasks.section");
  const { can } = usePermissions();
  const { data } = useLeadOpenTasks(leadId);
  const cancelTask = useCancelTask();
  const [scheduling, setScheduling] = useState(false);
  const [completing, setCompleting] = useState<Task | null>(null);

  if (!can("task.read")) return null;

  const tasks = data?.items ?? [];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("title")}
        </h3>
        {can("task.create") && leadOpen ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7"
            onClick={() => setScheduling(true)}
          >
            <AppIcons.create className="size-3.5" />
            {t("add")}
          </Button>
        ) : null}
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={setCompleting}
              onCancel={(item) => void cancelTask.mutateAsync(item.id)}
            />
          ))}
        </div>
      )}
      <ScheduleTaskDialog
        open={scheduling}
        leadId={leadId}
        onClose={() => setScheduling(false)}
      />
      <CompleteTaskDialog task={completing} onClose={() => setCompleting(null)} />
    </section>
  );
}
