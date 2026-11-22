"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSectionCard } from "@/features/dashboard/components/dashboard-section-card";
import type { DashboardSectionProps } from "@/features/dashboard/v2/period";
import { formatCompactMoney } from "@/features/targets/utils/target-format";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { TeamHeatmap } from "./team-heatmap";
import { useDashboardTeam } from "./team-hooks";
import { TeamTable } from "./team-table";
import { formatMinutes, formatPct, type DashboardTeam } from "./team-types";

/** Spec §5.3 — "Is the team doing the work?". */
export function TeamSection({ period }: DashboardSectionProps) {
  const query = useDashboardTeam(period);

  return (
    <section aria-labelledby="team-heading" className="space-y-3">
      <div>
        <h2 id="team-heading" className="text-sm font-semibold">
          Is the team doing the work?
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Activity, discipline and results per person. Click a name for their leads.
        </p>
      </div>

      {query.isPending ? (
        <TeamSkeleton />
      ) : query.isError ? (
        <TeamError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <TeamContent data={query.data} />
      )}
    </section>
  );
}

function computedLabel(iso: string | null, timeZone: string): string {
  if (!iso) return "Task and SLA figures appear once the daily stats job has run.";
  const time = new Date(iso).toLocaleString(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
  return `Task and SLA figures as of ${time} (refreshed every 15 minutes).`;
}

function TeamContent({ data }: { data: DashboardTeam }) {
  const { totals } = data;
  const summary: Array<{ label: string; value: string; hint?: string }> = [
    { label: "Interactions today", value: formatNumber(totals.interactionsToday) },
    { label: "In the period", value: formatNumber(totals.interactions) },
    {
      label: "Tasks done",
      value: formatPct(totals.taskCompletionPct),
      hint: `${formatNumber(totals.tasksDone)} of ${formatNumber(totals.tasksDue)} due`,
    },
    { label: "Overdue now", value: formatNumber(totals.overdueNow) },
    {
      label: "SLA on time",
      value: formatPct(totals.slaCompliancePct),
      hint: `${formatNumber(totals.slaHits)} on time · ${formatNumber(totals.slaMisses)} late`,
    },
    {
      label: "Median 1st reply",
      value: formatMinutes(totals.medianFirstResponseMinutes),
      hint: `${formatNumber(totals.firstResponseSamples)} leads, working time`,
    },
    {
      label: "Deals",
      value: formatNumber(totals.deals),
      hint: `${formatCompactMoney(totals.revenue, data.currency)} contracted`,
    },
  ];

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 shadow-sm sm:grid-cols-4 xl:grid-cols-7">
        {summary.map((item) => (
          <div key={item.label} className="bg-card px-3.5 py-2.5" title={item.hint}>
            <dt className="truncate text-[11px] text-muted-foreground">{item.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
            {item.hint ? (
              <dd className="truncate text-[10px] text-muted-foreground">{item.hint}</dd>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DashboardSectionCard
          icon={AppIcons.team}
          title="Team"
          subtitle={`${formatNumber(data.members.length)} people · sort by any column`}
          contentClassName="p-0"
        >
          <TeamTable members={data.members} currency={data.currency} />
        </DashboardSectionCard>
        <DashboardSectionCard
          icon={AppIcons.activity}
          title="When the team works"
          subtitle={`Interactions by hour · ${data.period.timeZone}`}
        >
          <TeamHeatmap heatmap={data.heatmap} weekStartsOn={data.weekStartsOn} />
        </DashboardSectionCard>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {computedLabel(data.statsComputedAt, data.period.timeZone)} Interactions, visits, deals and
        overdue are live. Target % uses the deals target when set, otherwise the first target set
        (hover for all).
      </p>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-3 2xl:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function TeamError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <AppIcons.alertCircle className="size-3.5" />
        {forbidden ? "Your plan or role does not include analytics." : "Could not load the team numbers."}
      </span>
      {forbidden ? null : (
        <Button type="button" size="xs" variant="outline" onClick={onRetry}>
          <AppIcons.refresh />
          Retry
        </Button>
      )}
    </div>
  );
}
