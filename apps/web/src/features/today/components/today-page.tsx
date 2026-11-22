"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconAlarm,
  IconBolt,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconCheck,
  IconClockPause,
  IconFlame,
  IconMapPin,
  IconPhone,
  IconSparkles,
  IconTrophy,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import { OUTCOME_LABELS, type InteractionOutcome } from "@crmpro/shared";
import { StageBadge } from "@/components/crm/stage-visuals";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogInteractionDialog } from "@/features/leads/components/log-interaction-dialog";
import { runContactAction } from "@/features/leads/components/masked-contact";
import { MoveStageDialog } from "@/features/leads/components/move-stage-dialog";
import {
  formatDue,
  HeatBadge,
  TASK_TYPE_ICONS,
} from "@/features/leads/components/workflow-visuals";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { SnoozeDialog, useFinishTask } from "@/features/today/components/task-actions";
import { MonthTargetsCard } from "@/features/targets/components/month-targets-card";
import { useToday } from "@/features/today/hooks";
import type { SuggestedLead, TodayData, TodayTask } from "@/features/today/types";
import { useNow } from "@/hooks/use-now";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The agent's home (workflow spec §4): the system's plan for the day, in the
 * order it should be done. One big "Up next" card, then the queue.
 */
export function TodayPage() {
  const { data, isLoading, isError, refetch } = useToday();
  const [snoozing, setSnoozing] = useState<TodayTask | null>(null);

  if (isLoading && !data) return <TodaySkeleton />;
  if (isError || !data) {
    return (
      <div className="px-4 py-10 text-center md:px-8">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your day.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { sections } = data;
  const queueEmpty =
    !data.upNext &&
    sections.speedToLead.length +
      sections.overdue.length +
      sections.scheduled.length +
      sections.followUps.length ===
    0;

  return (
    <div className="space-y-5 px-4 py-5 md:px-8">
      <DayHeader data={data} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {data.upNext ? (
            <UpNextCard task={data.upNext} onSnooze={() => setSnoozing(data.upNext)} />
          ) : null}

          {queueEmpty ? (
            <AllCaughtUp suggested={data.suggested.length > 0} />
          ) : (
            <>
              <QueueSection
                title="Speed to lead"
                hint="New leads — call before the timer runs out"
                icon={IconBolt}
                tone="danger"
                tasks={sections.speedToLead}
                onSnooze={setSnoozing}
              />
              <QueueSection
                title="Overdue"
                hint="Most important first"
                icon={IconAlarm}
                tone="danger"
                tasks={sections.overdue}
                onSnooze={setSnoozing}
              />
              <QueueSection
                title="Scheduled"
                hint="Meetings and visits, today and tomorrow morning"
                icon={IconCalendarEvent}
                tone="info"
                tasks={sections.scheduled}
                onSnooze={setSnoozing}
              />
              <QueueSection
                title="Follow-ups due today"
                icon={IconCheck}
                tone="neutral"
                tasks={sections.followUps}
                onSnooze={setSnoozing}
              />
            </>
          )}

          {data.suggested.length > 0 ? <SuggestedSection leads={data.suggested} /> : null}
        </div>

        <aside className="space-y-4">
          <MonthTargetsCard />
          <MonthCard data={data} />
          <UpcomingCard tasks={data.upcoming} />
          <AllTimeCard data={data} />
        </aside>
      </div>

      <SnoozeDialog task={snoozing} onClose={() => setSnoozing(null)} />
      <LogInteractionDialog />
      <MoveStageDialog />
    </div>
  );
}

/* ─── Header ──────────────────────────────────────────────────────────── */

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function DayHeader({ data }: { data: TodayData }) {
  const now = useNow(60_000);
  const firstName = data.user.name.split(" ")[0];
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: data.timeZone,
  }).format(now);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: data.timeZone }).format(now),
  );
  const { counters } = data;

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:flex-row sm:items-center sm:p-5">
      <ProgressRing percent={data.progress.percent} done={data.progress.done} planned={data.progress.planned} />
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting(hour)}, {firstName}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {date}
          {data.workday.isWorkingDay ? null : " · Day off"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {data.streak > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
              <IconFlame className="size-3.5" />
              {data.streak}-day streak
            </span>
          ) : null}
          <Counter icon={IconPhone} label="Calls" value={counters.calls} />
          <Counter icon={IconBrandWhatsapp} label="WhatsApp" value={counters.whatsapp} />
          <Counter icon={IconUsers} label="Meetings" value={counters.meetings} />
          <Counter icon={IconMapPin} label="Visits" value={counters.visits} />
        </div>
      </div>
      <div className="sm:w-48">
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Touches today</span>
          <span className="tabular-nums">
            <span className="text-base font-semibold text-foreground">{counters.total}</span> / {counters.goal}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-slow ease-smooth"
            style={{ width: `${Math.min(100, Math.round((counters.total / Math.max(1, counters.goal)) * 100))}%` }}
          />
        </div>
      </div>
    </header>
  );
}

function ProgressRing({ percent, done, planned }: { percent: number; done: number; planned: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, percent) / 100);
  return (
    <div className="relative size-20 shrink-0" title={`${done} of ${planned} planned tasks done`}>
      <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
        <circle cx="36" cy="36" r={radius} className="fill-none stroke-muted" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className="fill-none stroke-primary transition-[stroke-dashoffset] duration-slow ease-smooth"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-base font-semibold tabular-nums">
          {done}/{planned}
        </span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">done</span>
      </div>
    </div>
  );
}

function Counter({ icon: Icon, label, value }: { icon: Icon; label: string; value: number }) {
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground"
    >
      <Icon className="size-3.5" />
      <span className="font-medium text-foreground tabular-nums">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

/* ─── Up next ─────────────────────────────────────────────────────────── */

function UpNextCard({ task, onSnooze }: { task: TodayTask; onSnooze: () => void }) {
  const finish = useFinishTask();
  const TypeIcon = TASK_TYPE_ICONS[task.type];
  const lead = task.lead;

  const contact = async (action: "CALL" | "WHATSAPP") => {
    if (!lead) return;
    await runContactAction(lead.id, "primaryPhone", action);
    // Coming back from the call/chat: log it while it's fresh.
    finish(task, action === "CALL" ? "CALL" : "WHATSAPP");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-primary/15 bg-primary/5 px-4 py-2 text-xs font-medium text-primary">
        <IconSparkles className="size-3.5" />
        Up next
        <span className="ml-auto">
          <DueLabel task={task} />
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TypeIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug">{task.title}</h2>
          {lead ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Link href={`/leads?id=${lead.id}`} className="text-sm font-medium hover:underline">
                {lead.fullName}
              </Link>
              <HeatBadge heat={lead.heat} />
              <StageBadge stage={lead.stage} size="xs" />
            </div>
          ) : null}
          <TaskContext task={task} className="mt-2" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3 sm:px-5">
        {lead ? (
          <>
            <Button size="sm" onClick={() => void contact("CALL")}>
              <IconPhone className="size-4" />
              Call
            </Button>
            <Button size="sm" variant="outline" onClick={() => void contact("WHATSAPP")}>
              <IconBrandWhatsapp className="size-4" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={() => finish(task)}>
              <IconCheck className="size-4" />
              Log &amp; done
            </Button>
          </>
        ) : (
          <TaskWithoutLeadAction task={task} />
        )}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onSnooze}>
          <IconClockPause className="size-4" />
          Snooze
        </Button>
      </div>
    </section>
  );
}

/** Last outcome, unanswered streak and project — enough to act without opening the lead. */
function TaskContext({ task, className }: { task: TodayTask; className?: string }) {
  const context = task.context;
  if (!context) return null;
  const bits: string[] = [];
  if (context.lastOutcome) {
    bits.push(`Last: ${OUTCOME_LABELS[context.lastOutcome as InteractionOutcome] ?? context.lastOutcome}`);
  } else {
    bits.push("Never contacted");
  }
  if (context.unansweredStreak >= 2) bits.push(`${context.unansweredStreak} unanswered in a row`);
  if (context.projectName) bits.push(`Interested in ${context.projectName}`);
  return <p className={cn("text-xs text-muted-foreground", className)}>{bits.join(" · ")}</p>;
}

/** First-contact tasks count down to the SLA; others show the due time. */
function DueLabel({ task }: { task: TodayTask }) {
  const now = useNow(task.ruleKey === "first_contact" ? 1_000 : 30_000);
  const due = new Date(task.dueAt).getTime();
  if (task.ruleKey === "first_contact") {
    const left = due - now;
    if (left > 0) {
      const minutes = Math.floor(left / 60_000);
      const seconds = Math.floor((left % 60_000) / 1000);
      return (
        <span className="tabular-nums text-destructive">
          Call within {minutes}:{String(seconds).padStart(2, "0")}
        </span>
      );
    }
    const escalate = task.escalateAt ? new Date(task.escalateAt).getTime() : null;
    if (escalate && escalate > now) {
      return (
        <span className="text-destructive">
          SLA missed · manager alerted in {Math.ceil((escalate - now) / 60_000)}m
        </span>
      );
    }
    return <span className="text-destructive">SLA missed · manager alerted</span>;
  }
  return (
    <span className={cn(due < now && "text-destructive")}>{formatDue(task.dueAt, new Date(now))}</span>
  );
}

/** Manager tasks without a lead (e.g. "Assign 3 new leads"). */
function TaskWithoutLeadAction({ task }: { task: TodayTask }) {
  if (task.ruleKey === "assign_new_leads") {
    return (
      <Button size="sm" asChild>
        <Link href="/leads?assignees=unassigned">Open unassigned leads</Link>
      </Button>
    );
  }
  return null;
}

/* ─── Queue ───────────────────────────────────────────────────────────── */

const TONES = {
  danger: "text-destructive",
  info: "text-sky-700 dark:text-sky-400",
  neutral: "text-muted-foreground",
} as const;

function QueueSection({
  title,
  hint,
  icon: Icon,
  tone,
  tasks,
  onSnooze,
}: {
  title: string;
  hint?: string;
  icon: Icon;
  tone: keyof typeof TONES;
  tasks: TodayTask[];
  onSnooze: (task: TodayTask) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <Icon className={cn("size-4 shrink-0 self-center", TONES[tone])} />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{tasks.length}</span>
        {hint ? <span className="hidden truncate text-xs text-muted-foreground sm:inline">· {hint}</span> : null}
      </div>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onSnooze={() => onSnooze(task)} />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({ task, onSnooze }: { task: TodayTask; onSnooze: () => void }) {
  const finish = useFinishTask();
  const openDrawerLink = task.lead ? `/leads?id=${task.lead.id}` : null;
  const TypeIcon = TASK_TYPE_ICONS[task.type];
  return (
    <li className="group flex items-center gap-3 px-3 py-2.5 transition-colors duration-fast hover:bg-muted/30">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          task.priority === "URGENT" && "bg-destructive/10 text-destructive",
          task.priority === "HIGH" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        )}
      >
        <TypeIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{task.title}</span>
          {task.lead ? <HeatBadge heat={task.lead.heat} compact /> : null}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {task.lead && openDrawerLink ? (
            <Link href={openDrawerLink} className="truncate hover:text-foreground hover:underline">
              {task.lead.fullName}
            </Link>
          ) : null}
          <span aria-hidden>·</span>
          <span className="shrink-0">
            <DueLabel task={task} />
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {task.lead ? (
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => finish(task)}>
            <IconCheck className="size-3.5" />
            <span className="hidden sm:inline">Done</span>
          </Button>
        ) : (
          <TaskWithoutLeadAction task={task} />
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          className="size-7"
          title="Snooze"
          aria-label={`Snooze ${task.title}`}
          onClick={onSnooze}
        >
          <IconClockPause className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function AllCaughtUp({ suggested }: { suggested: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <IconCheck className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        {suggested
          ? "Nothing is due. Use the time on the clients below — they haven't heard from you in a while."
          : "Nothing is due right now. New leads and follow-ups will appear here as they come in."}
      </p>
    </div>
  );
}

function SuggestedSection({ leads }: { leads: SuggestedLead[] }) {
  const openLogDialog = useLeadUiStore((s) => s.openLogDialog);
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <IconSparkles className="size-4 shrink-0 self-center text-primary" />
        <h2 className="text-sm font-semibold">Suggested</h2>
        <span className="text-xs text-muted-foreground">· Revive to reach today&apos;s goal</span>
      </div>
      <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card shadow-xs">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Link href={`/leads?id=${lead.id}`} className="truncate text-sm font-medium hover:underline">
                  {lead.fullName}
                </Link>
                <HeatBadge heat={lead.heat} compact />
                <StageBadge stage={lead.stage} size="xs" />
              </div>
              <p className="text-xs text-muted-foreground">{lead.reason}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() => {
                void runContactAction(lead.id, "primaryPhone", "CALL").then(() =>
                  openLogDialog({ leadId: lead.id, leadName: lead.fullName, channel: "CALL" }),
                );
              }}
            >
              <IconPhone className="size-3.5" />
              Call
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── Side panel ──────────────────────────────────────────────────────── */

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums">{formatNumber(value)}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MonthCard({ data }: { data: TodayData }) {
  return (
    <SideCard title="This month">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Deals won" value={data.month.won} />
        <Stat label="New leads" value={data.month.newLeads} />
        <Stat label="Interactions" value={data.month.interactions} />
        <Stat label="Visits" value={data.month.visits} />
      </div>
    </SideCard>
  );
}

function UpcomingCard({ tasks }: { tasks: TodayTask[] }) {
  return (
    <SideCard title="Coming up">
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing planned for the next few days yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const TypeIcon = TASK_TYPE_ICONS[task.type];
            return (
              <li key={task.id} className="flex items-start gap-2 text-xs">
                <TypeIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{task.title}</div>
                  <div className="truncate text-muted-foreground">
                    {task.lead ? `${task.lead.fullName} · ` : null}
                    {formatDue(task.dueAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SideCard>
  );
}

function AllTimeCard({ data }: { data: TodayData }) {
  const since = new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(
    new Date(data.allTime.since),
  );
  return (
    <SideCard title="All time">
      <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 px-3 py-2.5">
        <IconTrophy className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <div className="text-lg font-semibold leading-tight tabular-nums">{formatNumber(data.allTime.won)}</div>
          <div className="text-xs text-muted-foreground">deals closed</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Clients" value={data.allTime.clients} />
        <Stat label="Touches" value={data.allTime.interactions} />
        <Stat label="Visits" value={data.allTime.visits} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Since {since}</span>
        <Link href="/performance" className="font-medium text-primary hover:underline">
          My performance →
        </Link>
      </div>
    </SideCard>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-5 px-4 py-5 md:px-8">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
