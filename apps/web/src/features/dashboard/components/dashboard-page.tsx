"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import type { DashboardRange } from "@/features/dashboard/types";
import {
  isDashboardEffectivelyEmpty,
  getDashboardListPanelHeight,
  getDashboardListRowCount,
} from "@/features/dashboard/utils";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "./activity-feed";
import { DashboardChartsRow } from "./dashboard-charts-row";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { DeveloperPerformancePanel } from "./developer-performance-panel";
import { EmptyDashboard } from "./empty-dashboard";
import { KpiGrid } from "./kpi-grid";
import { LeadSourcesPanel } from "./lead-sources-panel";
import { PipelineFunnel } from "./pipeline-funnel";
import { ProjectInterestPanel } from "./project-interest-panel";
import { QuickActions } from "./quick-actions";
import { StatusDistributionPanel } from "./status-distribution-panel";
import { TeamPerformance } from "./team-performance";
import { TrendsChart } from "./trends-chart";

export function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("30d");
  const { data, isLoading, isError, refetch, isFetching } = useDashboardSummary({
    range,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        <DashboardHeader range={range} onRangeChange={setRange} isRefreshing={false} />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load dashboard
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your analytics. Check your connection and try
              again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isDashboardEffectivelyEmpty(data)) {
    return (
      <div className="space-y-6">
        <DashboardHeader range={range} onRangeChange={setRange} isRefreshing={isFetching} />
        <EmptyDashboard />
        <QuickActions />
      </div>
    );
  }

  const showChartsRow = data.pipeline || data.trends;
  const showSecondaryRow = data.team || data.activity;
  const showAnalyticsRow =
    data.sources || data.projects || data.developers || data.status;
  const listRowCount = getDashboardListRowCount(
    data.pipeline?.stages.length,
    Boolean(data.trends),
  );
  const listPanelHeight = getDashboardListPanelHeight(listRowCount);
  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="space-y-4">
      <DashboardHeader
        range={range}
        onRangeChange={setRange}
        isRefreshing={isRefreshing}
      />

      <div
        className={cn(
          "space-y-4 transition-opacity duration-200",
          isRefreshing && "pointer-events-none opacity-60",
        )}
      >
        {data.overview ? <KpiGrid overview={data.overview} /> : null}

        {showChartsRow ? (
          <DashboardChartsRow
            pipeline={
              data.pipeline ? (
                <PipelineFunnel
                  pipeline={data.pipeline}
                  listPanelHeight={listPanelHeight}
                  listRowCount={listRowCount}
                />
              ) : undefined
            }
            trends={
              data.trends ? (
                <TrendsChart
                  trends={data.trends}
                  listPanelHeight={listPanelHeight}
                  listRowCount={listRowCount}
                />
              ) : undefined
            }
          />
        ) : null}

        {showSecondaryRow ? (
          <div
            className={`grid grid-cols-1 gap-3 ${
              data.team && data.activity ? "xl:grid-cols-2" : ""
            }`}
          >
            {data.team ? <TeamPerformance team={data.team} /> : null}
            {data.activity ? <ActivityFeed activity={data.activity} /> : null}
          </div>
        ) : null}

        {showAnalyticsRow ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
            {data.sources?.length ? (
              <LeadSourcesPanel sources={data.sources} />
            ) : null}
            {data.projects?.length ? (
              <ProjectInterestPanel projects={data.projects} />
            ) : null}
            {data.developers?.length ? (
              <DeveloperPerformancePanel developers={data.developers} />
            ) : null}
            {data.status ? <StatusDistributionPanel status={data.status} /> : null}
          </div>
        ) : null}

        <QuickActions />
      </div>
    </div>
  );
}
