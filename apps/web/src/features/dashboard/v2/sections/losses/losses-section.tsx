"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSectionCard } from "@/features/dashboard/components/dashboard-section-card";
import { PipelineFunnel } from "@/features/dashboard/components/pipeline-funnel";
import { getDashboardListPanelHeight } from "@/features/dashboard/utils";
import type { DashboardSectionProps } from "@/features/dashboard/v2/period";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { LossesCohortTable } from "./losses-cohort-table";
import { useDashboardLosses } from "./losses-hooks";
import { LossesReasons } from "./losses-reasons";
import type { DashboardLosses } from "./losses-types";
import { LossesWonBack } from "./losses-won-back";

/** Funnel stage list rows shown before it scrolls. */
const FUNNEL_LIST_ROWS = 4;

/** Spec §5.5 — "Where do we lose?". */
export function LossesSection({ period }: DashboardSectionProps) {
  const query = useDashboardLosses(period);

  return (
    <section aria-labelledby="losses-heading" className="space-y-3">
      <div>
        <h2 id="losses-heading" className="text-sm font-semibold">
          Where do we lose?
        </h2>
        <p className="text-[11px] text-muted-foreground">
          How far each month&rsquo;s leads get, how long stages take, and why deals die.
        </p>
      </div>

      {query.isPending ? (
        <LossesSkeleton />
      ) : query.isError ? (
        <LossesError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <LossesContent data={query.data} />
      )}
    </section>
  );
}

function LossesContent({ data }: { data: DashboardLosses }) {
  const listRows = Math.min(FUNNEL_LIST_ROWS, Math.max(data.funnel.stages.length, 1));

  return (
    <div className="space-y-3">
      <DashboardSectionCard
        icon={AppIcons.chartBar}
        title="Conversion by created month"
        subtitle={`${data.pipeline?.name ?? "Pipeline"} · share of each month's leads that reached the stage`}
      >
        <LossesCohortTable stages={data.funnelStages} cohorts={data.cohorts} durations={data.stageDurations} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          A lead counts for every stage up to the furthest one it reached (won leads pass them all).
          Days in stage: average time before leads moved on, for moves made in the period.
        </p>
      </DashboardSectionCard>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <DashboardSectionCard
          icon={AppIcons.alertTriangle}
          title="Why we lose"
          subtitle={`${formatNumber(data.lost.total)} leads lost in the period`}
        >
          <LossesReasons lost={data.lost} />
        </DashboardSectionCard>
        <DashboardSectionCard
          icon={AppIcons.refresh}
          title="Recycled leads won back"
          subtitle="Lost leads that came back and closed"
        >
          <LossesWonBack wonBack={data.wonBack} timeZone={data.period.timeZone} />
        </DashboardSectionCard>
        {data.funnel.stages.length > 0 ? (
          <PipelineFunnel
            pipeline={data.funnel}
            listPanelHeight={getDashboardListPanelHeight(listRows)}
            listRowCount={listRows}
          />
        ) : null}
      </div>
    </div>
  );
}

function LossesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-56 rounded-xl" />
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

function LossesError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <AppIcons.alertCircle className="size-3.5" />
        {forbidden ? "Your plan or role does not include analytics." : "Could not load the loss numbers."}
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
