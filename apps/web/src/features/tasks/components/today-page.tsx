"use client";

import { ProjectUpdatesWidget } from "@/features/project-updates/components/project-updates-widget";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/features/leads/hooks";
import { CompleteTaskDialog } from "@/features/tasks/components/complete-task-dialog";
import { TaskItem } from "@/features/tasks/components/task-item";
import { useTaskSummary, useTasks } from "@/features/tasks/hooks";
import { useCancelTask } from "@/features/tasks/mutations";
import type { Task } from "@/features/tasks/types";
import { localDayBounds } from "@/features/tasks/utils";
import { useLeadScope } from "@/hooks/use-lead-scope";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TodayPage() {
  const t = useTranslations("today");
  const router = useRouter();
  const { can } = usePermissions();
  const leadScope = useLeadScope();
  const showAssignee = leadScope !== "own";
  const [completing, setCompleting] = useState<Task | null>(null);
  const cancelTask = useCancelTask();

  // Fixed for the lifetime of the page so query keys stay stable.
  const ranges = useMemo(() => {
    const now = new Date();
    const { todayEnd, weekEnd } = localDayBounds(now);
    return {
      now: now.toISOString(),
      todayEnd: todayEnd.toISOString(),
      weekEnd: weekEnd.toISOString(),
    };
  }, []);

  const summary = useTaskSummary();
  const overdue = useTasks({ status: "OPEN", overdueOnly: true, limit: 50 });
  const today = useTasks({
    status: "OPEN",
    dueFrom: ranges.now,
    dueTo: ranges.todayEnd,
    limit: 50,
  });
  const upcoming = useTasks({
    status: "OPEN",
    dueFrom: ranges.todayEnd,
    dueTo: ranges.weekEnd,
    limit: 20,
  });
  const notContacted = useLeads(
    {
      neverContacted: true,
      status: "OPEN",
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "asc",
    },
  );

  const slaBreached = useLeads(
    { slaBreached: true, status: "OPEN", limit: 20, sortBy: "createdAt", sortOrder: "asc" },
  );
  const showSla = leadScope !== "own" && (slaBreached.data?.pagination.totalItems ?? 0) > 0;

  const openLead = (leadId: string) => router.push(`/leads?id=${leadId}`);

  const kpis = [
    { key: "overdue", value: summary.data?.overdue, tone: "danger" },
    { key: "dueToday", value: summary.data?.dueToday, tone: "primary" },
    { key: "upcoming", value: summary.data?.upcoming, tone: "muted" },
    {
      key: "notContacted",
      value: notContacted.data?.pagination.totalItems,
      tone: "warning",
    },
  ] as const;

  return (
    <div className="space-y-5 px-6 py-5 md:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.key} className="rounded-xl border bg-card px-4 py-3 shadow-xs">
            <p className="text-xs text-muted-foreground">{t(`kpis.${kpi.key}`)}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                kpi.tone === "danger" && (kpi.value ?? 0) > 0 && "text-destructive",
                kpi.tone === "warning" && (kpi.value ?? 0) > 0 && "text-amber-600 dark:text-amber-400",
                kpi.tone === "primary" && "text-primary",
              )}
            >
              {kpi.value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <TaskSection
            title={t("sections.overdue")}
            empty={t("empty.overdue")}
            loading={overdue.isLoading}
            tasks={overdue.data?.items ?? []}
            onComplete={setCompleting}
            onCancel={(task) => void cancelTask.mutateAsync(task.id)}
            onOpenLead={openLead}
            showAssignee={showAssignee}
            tone="danger"
          />
          <TaskSection
            title={t("sections.today")}
            empty={t("empty.today")}
            loading={today.isLoading}
            tasks={today.data?.items ?? []}
            onComplete={setCompleting}
            onCancel={(task) => void cancelTask.mutateAsync(task.id)}
            onOpenLead={openLead}
            showAssignee={showAssignee}
          />
          <TaskSection
            title={t("sections.upcoming")}
            empty={t("empty.upcoming")}
            loading={upcoming.isLoading}
            tasks={upcoming.data?.items ?? []}
            onComplete={setCompleting}
            onOpenLead={openLead}
            showAssignee={showAssignee}
          />
          <ProjectUpdatesWidget />
        </div>

        {can("lead.read") ? (
          <div className="space-y-5">
          {showSla ? (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                <AppIcons.alertTriangle className="size-3.5" />
                {t("sections.slaBreached")} ({slaBreached.data?.pagination.totalItems})
              </h2>
              <ul className="divide-y rounded-lg border border-destructive/30 bg-card">
                {slaBreached.data!.items.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads?id=${lead.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{lead.fullName}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {lead.assignee?.name ?? "—"}
                          {lead.source ? ` · ${lead.source.name}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-destructive">
                        {lead.assignedAt ? formatRelativeTime(lead.assignedAt) : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("sections.notContacted")}
            </h2>
            {notContacted.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (notContacted.data?.items.length ?? 0) === 0 ? (
              <EmptyLine text={t("empty.notContacted")} />
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {notContacted.data!.items.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/leads?id=${lead.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {lead.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground tabular-nums">
                          {lead.primaryPhone}
                          {lead.source ? ` · ${lead.source.name}` : ""}
                          {showAssignee && lead.assignee
                            ? ` · ${lead.assignee.name}`
                            : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                        {formatRelativeTime(lead.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        ) : null}
      </div>

      <CompleteTaskDialog task={completing} onClose={() => setCompleting(null)} />
    </div>
  );
}

function TaskSection({
  title,
  empty,
  loading,
  tasks,
  onComplete,
  onCancel,
  onOpenLead,
  showAssignee,
  tone,
}: {
  title: string;
  empty: string;
  loading: boolean;
  tasks: Task[];
  onComplete: (task: Task) => void;
  onCancel?: (task: Task) => void;
  onOpenLead: (leadId: string) => void;
  showAssignee: boolean;
  tone?: "danger";
}) {
  return (
    <section className="space-y-2">
      <h2
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
          tone === "danger" && tasks.length > 0 && "text-destructive",
        )}
      >
        {tone === "danger" && tasks.length > 0 ? (
          <AppIcons.alertTriangle className="size-3.5" />
        ) : null}
        {title}
        {tasks.length > 0 ? <span className="tabular-nums">({tasks.length})</span> : null}
      </h2>
      {loading ? (
        <Skeleton className="h-16 w-full" />
      ) : tasks.length === 0 ? (
        <EmptyLine text={empty} />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onComplete}
              onCancel={onCancel}
              onOpenLead={onOpenLead}
              showAssignee={showAssignee}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
      {text}
    </p>
  );
}
