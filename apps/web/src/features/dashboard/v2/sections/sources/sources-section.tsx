"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardSectionCard } from "@/features/dashboard/components/dashboard-section-card";
import type { DashboardSectionProps } from "@/features/dashboard/v2/period";
import { ApiError } from "@/lib/api/client";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import { useDashboardSources } from "./sources-hooks";
import { SourcesProjectDemand } from "./sources-project-demand";
import { SourcesTable } from "./sources-table";
import { formatRate, type DashboardSources } from "./sources-types";

/** Spec §5.4 — "Which leads are worth it?". */
export function SourcesSection({ period }: DashboardSectionProps) {
  const query = useDashboardSources(period);

  return (
    <section aria-labelledby="sources-heading" className="space-y-3">
      <div>
        <h2 id="sources-heading" className="text-sm font-semibold">
          Which leads are worth it?
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Leads created in the period, by source, and what has come of them since.
        </p>
      </div>

      {query.isPending ? (
        <SourcesSkeleton />
      ) : query.isError ? (
        <SourcesError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SourcesContent data={query.data} />
      )}
    </section>
  );
}

function spendNote(data: DashboardSources): string {
  if (!data.spendVisible) {
    return "Spend and cost per lead are workspace-wide, so they show only to people who see every lead.";
  }
  const basis =
    data.spendBasis === "full-month"
      ? "Spend is the month's entry."
      : "Spend is prorated by the days of each month in the window; the current month's entry counts as spent so far.";
  return basis;
}

function SourcesContent({ data }: { data: DashboardSources }) {
  const { totals } = data;
  const money = (value: number | null) => (value === null ? "—" : formatCompactMoney(value, data.currency));
  const badges = [
    `${formatNumber(totals.leads)} leads`,
    `${formatRate(totals.winRate)} win rate`,
    ...(data.spendVisible ? [`${money(totals.costPerLead)} per lead`] : []),
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <DashboardSectionCard
          icon={AppIcons.leadSources}
          title="Sources"
          subtitle={
            data.spendVisible
              ? `${money(totals.spend)} spent · ${money(totals.costPerDeal)} per deal`
              : "Rates per source"
          }
          badges={badges.map((badge) => (
            <span
              key={badge}
              className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground tabular-nums sm:inline"
            >
              {badge}
            </span>
          ))}
          contentClassName="p-0"
        >
          <SourcesTable
            sources={data.sources}
            currency={data.currency}
            spendVisible={data.spendVisible}
            period={data.period}
          />
        </DashboardSectionCard>
        <DashboardSectionCard
          icon={AppIcons.projects}
          title="Project demand vs sales"
          subtitle="Interest added in the period · deals reserved in it"
        >
          <SourcesProjectDemand projects={data.projects} currency={data.currency} />
        </DashboardSectionCard>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Contacted = reached at least once; visited = a site visit or a &ldquo;visit done&rdquo;
        outcome; win rate = won of those closed; revenue = their contracted deals. {spendNote(data)}
        {data.spendVisible ? (
          <>
            {" "}
            <Link href="/settings/spend" className="text-primary hover:underline">
              Enter marketing spend
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

function SourcesSkeleton() {
  return (
    <div className="grid gap-3 2xl:grid-cols-[2fr_1fr]">
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function SourcesError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <AppIcons.alertCircle className="size-3.5" />
        {forbidden ? "Your plan or role does not include analytics." : "Could not load the source numbers."}
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
