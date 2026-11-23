"use client";

import { IconChartBar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AllTimeStrip } from "@/features/performance/components/all-time-strip";
import { BadgesGrid } from "@/features/performance/components/badges-grid";
import { LeaderboardCard } from "@/features/performance/components/leaderboard-card";
import { MonthVsTarget } from "@/features/performance/components/month-vs-target";
import { MonthlyChart } from "@/features/performance/components/monthly-chart";
import { PersonalBests } from "@/features/performance/components/personal-bests";
import {
  PrivacyProvider,
  PrivacyToggle,
  PrivateBlock,
} from "@/components/crm/privacy";
import { useMyPerformance } from "@/features/performance/hooks";
import type { MyPerformance } from "@/features/performance/types";
import { formatMonthYear } from "@/features/performance/utils/performance-format";
import { cn } from "@/lib/utils";

/**
 * "My performance" (workflow spec §4.1): all-time totals, this month vs
 * target, the last 12 months, personal bests, badges and — when the
 * workspace shows it — the leaderboard.
 */
export function PerformancePage() {
  const { data, isLoading, isError, refetch } = useMyPerformance();

  if (isLoading && !data) return <PerformanceSkeleton />;
  if (isError || !data) {
    return (
      <div className="px-4 py-10 text-center md:px-8">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your performance.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const hasSide = data.month !== null || data.rank !== null;

  return (
    <PrivacyProvider>
    <div className="space-y-5 px-4 py-5 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">My performance</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your numbers, personal bests and badges · since {formatMonthYear(data.allTime.since, data.timeZone)}
          </p>
        </div>
        <PrivacyToggle />
      </header>

      {isFreshStart(data) ? <FreshStart /> : null}

      <PrivateBlock>
        <AllTimeStrip data={data} />
      </PrivateBlock>

      <div className={cn("grid gap-5", hasSide && "lg:grid-cols-[minmax(0,1fr)_340px]")}>
        <div className="min-w-0 space-y-5">
          <MonthlyChart months={data.months} currency={data.currency} />
          <PersonalBests data={data} />
        </div>
        {hasSide ? (
          <aside className="min-w-0 space-y-5">
            {data.month ? <MonthVsTarget month={data.month} /> : null}
            {data.rank ? <LeaderboardCard rank={data.rank} currency={data.currency} timeZone={data.timeZone} /> : null}
          </aside>
        ) : null}
      </div>

      <BadgesGrid badges={data.badges} currency={data.currency} timeZone={data.timeZone} />
    </div>
    </PrivacyProvider>
  );
}

function isFreshStart(data: MyPerformance): boolean {
  return data.allTime.deals === 0 && data.allTime.interactions === 0;
}

function FreshStart() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconChartBar className="size-4" />
      </span>
      <div>
        <p className="text-sm font-medium">Nothing here yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Log calls and visits from Today and record deals on won leads — your totals, bests and badges fill in
          as you go.
        </p>
      </div>
    </div>
  );
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-5 px-4 py-5 md:px-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
