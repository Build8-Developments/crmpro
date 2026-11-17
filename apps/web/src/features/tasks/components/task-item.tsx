"use client";

import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import type { Task } from "@/features/tasks/types";
import { formatDueDate, TASK_TYPE_ICONS } from "@/features/tasks/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  onComplete: (task: Task) => void;
  onCancel?: (task: Task) => void;
  onOpenLead?: (leadId: string) => void;
  /** Show who owns the task (manager views). */
  showAssignee?: boolean;
}

export function TaskItem({
  task,
  onComplete,
  onCancel,
  onOpenLead,
  showAssignee = false,
}: TaskItemProps) {
  const t = useTranslations("tasks");
  const { can } = usePermissions();
  const Icon = TASK_TYPE_ICONS[task.type];
  const canUpdate = can("task.update") && task.status === "OPEN";

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md",
          task.isOverdue
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {task.lead ? (
            onOpenLead ? (
              <button
                type="button"
                className="hover:text-foreground hover:underline"
                onClick={() => onOpenLead(task.lead!.id)}
              >
                {task.lead.fullName}
              </button>
            ) : (
              task.lead.fullName
            )
          ) : null}
          {task.lead ? " · " : ""}
          <span className={cn(task.isOverdue && "font-medium text-destructive")}>
            {task.isOverdue
              ? `${t("section.overdue")} · ${formatDueDate(task.dueAt)}`
              : t("section.due", { when: formatDueDate(task.dueAt) })}
          </span>
          {showAssignee ? ` · ${task.assignedUser.name}` : ""}
        </p>
      </div>
      {canUpdate ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="outline" className="h-7" onClick={() => onComplete(task)}>
            <AppIcons.check className="size-3.5" />
            {t("actions.complete")}
          </Button>
          {onCancel ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={t("actions.cancel")}
              onClick={() => onCancel(task)}
            >
              <AppIcons.close className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
