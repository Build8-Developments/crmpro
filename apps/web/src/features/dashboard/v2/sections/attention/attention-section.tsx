"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSectionProps } from "@/features/dashboard/v2/period";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { AttentionAgentList } from "./attention-agent-list";
import { formatAge, formatClock } from "./attention-format";
import { useDashboardAttention } from "./attention-hooks";
import { AttentionStageList } from "./attention-stage-list";
import { AttentionTile } from "./attention-tile";
import { leadsHref, type DashboardAttention } from "./attention-types";

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

/**
 * Spec §5.1 — "Needs attention now": live counts (the period does not apply),
 * each linking to the leads list that shows the same leads, with reassign and
 * nudge for managers.
 */
export function NeedsAttentionSection({ period }: DashboardSectionProps) {
  const query = useDashboardAttention();

  return (
    // `data-period` only: these numbers are live, not tied to the period.
    <section aria-labelledby="attention-heading" data-period={period} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div>
          <h2 id="attention-heading" className="text-sm font-semibold">
            Needs attention now
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Live numbers — the period above does not change them.
            {query.data ? ` Updated ${formatClock(query.data.generatedAt)}.` : null}
          </p>
        </div>
      </div>

      {query.isPending ? (
        <AttentionSkeleton />
      ) : query.isError ? (
        <AttentionError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <AttentionContent data={query.data} />
      )}
    </section>
  );
}

function AttentionContent({ data }: { data: DashboardAttention }) {
  const now = useNow(60_000);
  const { can } = usePermissions();
  const canManage = can("lead.assign");
  const reassign = (href: string) => (canManage ? href : undefined);

  const overdue = data.overdueTasks;
  const hot = data.hotUntouched;
  const allClear =
    data.slaBreachesToday.count +
      overdue.taskCount +
      hot.count +
      data.noNextStep.count +
      data.stuck.count +
      data.stale.count +
      data.unassigned.count ===
    0;

  const stuckHref = leadsHref(data.stuck.listQuery);
  const staleHref = leadsHref(data.stale.listQuery);
  const showStages = data.stuck.byStage.length > 0 || data.stale.byStage.length > 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 shadow-sm sm:grid-cols-3 xl:grid-cols-6">
        <AttentionTile
          label="SLA breaches today"
          icon={AppIcons.clock}
          count={data.slaBreachesToday.count}
          href={leadsHref(data.slaBreachesToday.listQuery)}
          hint="First call missed the SLA"
          reassignHref={reassign(leadsHref(data.slaBreachesToday.listQuery))}
        />
        <AttentionTile
          label="Overdue tasks"
          icon={AppIcons.alertTriangle}
          count={overdue.leadCount}
          href={leadsHref(overdue.listQuery)}
          hint={
            overdue.taskCount > 0
              ? `${plural(overdue.taskCount, "task", "tasks")} · ${plural(overdue.agentCount, "agent", "agents")}`
              : "Leads with an overdue next step"
          }
          reassignHref={reassign(leadsHref(overdue.listQuery))}
        />
        <AttentionTile
          label={`Hot, untouched > ${hot.hours}h`}
          icon={AppIcons.activity}
          count={hot.count}
          href={leadsHref(hot.listQuery)}
          hint="Hot leads not contacted"
          reassignHref={reassign(leadsHref(hot.listQuery))}
        />
        <AttentionTile
          label="No next step"
          icon={AppIcons.userQuestion}
          count={data.noNextStep.count}
          href={leadsHref(data.noNextStep.listQuery)}
          hint="Assigned, no open task"
          reassignHref={reassign(leadsHref(data.noNextStep.listQuery))}
        />
        <AttentionTile
          label="Stuck deals"
          icon={AppIcons.stageChange}
          count={data.stuck.count}
          href={stuckHref}
          offLabel={data.stuck.stagesConfigured === 0 ? "Off — set stuck days per stage" : undefined}
          hint={
            data.stale.stagesConfigured > 0 ? (
              <Link href={staleHref} className="hover:text-foreground hover:underline">
                + {plural(data.stale.count, "stale lead", "stale leads")}
              </Link>
            ) : (
              "Over the stage's stuck days"
            )
          }
          reassignHref={reassign(stuckHref)}
        />
        <AttentionTile
          label="Unassigned"
          icon={AppIcons.userOff}
          count={data.unassigned.count}
          href={leadsHref(data.unassigned.listQuery)}
          hint={
            data.unassigned.oldestCreatedAt
              ? `Oldest waiting ${formatAge(data.unassigned.oldestCreatedAt, now)}`
              : "Every open lead has an owner"
          }
          reassignHref={reassign(leadsHref(data.unassigned.listQuery))}
        />
      </div>

      {allClear ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AppIcons.check className="size-3.5 text-primary" />
          Nothing needs attention right now.
        </p>
      ) : null}

      {overdue.byAgent.length > 0 || hot.byAgent.length > 0 || showStages ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overdue.byAgent.length > 0 ? (
            <AttentionAgentList
              title="Overdue tasks by agent"
              icon={AppIcons.alertTriangle}
              nudgeKind="overdue_tasks"
              canManage={canManage}
              moreCount={overdue.agentCount - overdue.byAgent.length}
              rows={overdue.byAgent.map((row) => ({
                ...row,
                primary: plural(row.taskCount, "task", "tasks"),
                secondary: `on ${plural(row.leadCount, "lead", "leads")} · oldest ${formatAge(row.oldestDueAt, now)}`,
              }))}
            />
          ) : null}
          {hot.byAgent.length > 0 ? (
            <AttentionAgentList
              title={`Hot leads untouched > ${hot.hours}h`}
              icon={AppIcons.activity}
              nudgeKind="hot_untouched"
              canManage={canManage}
              rows={hot.byAgent.map((row) => ({
                ...row,
                primary: plural(row.leadCount, "hot lead", "hot leads"),
              }))}
            />
          ) : null}
          {showStages ? <AttentionStageList stuck={data.stuck} stale={data.stale} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function AttentionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 sm:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="space-y-3 bg-card px-3.5 py-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

function AttentionError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <AppIcons.alertCircle className="size-3.5" />
        {forbidden
          ? "Your plan or role does not include analytics."
          : "Could not load what needs attention."}
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
