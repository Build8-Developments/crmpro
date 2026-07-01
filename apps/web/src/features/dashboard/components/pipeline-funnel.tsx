"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppIcons } from "@/components/icons/app-icons";
import type { PipelineAnalyticsData } from "@/features/dashboard/types";
import { dashboardLeadLinks } from "@/features/dashboard/dashboard-links";
import { formatDays, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardDetailList, DashboardDetailListRow } from "./dashboard-detail-list";
import { DashboardSectionCard } from "./dashboard-section-card";
import { DASHBOARD_CHART_HEIGHT, dashboardEnterStyle } from "../utils";

interface PipelineFunnelProps {
  pipeline: PipelineAnalyticsData;
  listPanelHeight: number;
  listRowCount: number;
}

export function PipelineFunnel({
  pipeline,
  listPanelHeight,
  listRowCount,
}: PipelineFunnelProps) {
  const chartData = pipeline.stages.map((stage) => ({
    name: stage.name,
    count: stage.count,
    avgDays: stage.avgDaysInStage,
    stageId: stage.stageId,
  }));

  const totalLeads = chartData.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...chartData.map((item) => item.count), 1);

  return (
    <DashboardSectionCard
      icon={AppIcons.pipelines}
      title="Pipeline Funnel"
      subtitle={
        pipeline.pipelineName
          ? pipeline.pipelineName
          : "Default sales pipeline"
      }
      badges={
        <>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {formatNumber(totalLeads)} leads
          </Badge>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {formatNumber(pipeline.stages.length)} stages
          </Badge>
        </>
      }
      style={dashboardEnterStyle(2)}
      className="h-full"
      contentClassName="flex h-full flex-col gap-2.5 pt-2.5"
    >
      <div
        className="w-full min-w-0 shrink-0"
        style={{ height: DASHBOARD_CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              className="stroke-border/50"
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={88}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--foreground)", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as (typeof chartData)[number];
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {formatNumber(item.count)} · avg {formatDays(item.avgDays)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.stageId}
                  fill={`var(--chart-${(index % 5) + 1})`}
                  fillOpacity={0.6 + (entry.count / maxCount) * 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DashboardDetailList
        height={listPanelHeight}
        rowCount={listRowCount}
        title={`${pipeline.stages.length} stages`}
      >
        {pipeline.stages.map((stage, index) => {
          const share = totalLeads > 0 ? (stage.count / totalLeads) * 100 : 0;
          return (
            <DashboardDetailListRow key={stage.stageId}>
              <Link
                href={dashboardLeadLinks.stage(stage.stageId)}
                className="flex min-w-0 flex-1 items-center gap-2 transition-colors duration-150 hover:opacity-80"
              >
              <span className="w-5 shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-foreground">
                    {stage.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px] tabular-nums"
                    >
                      {formatNumber(stage.count)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] tabular-nums"
                    >
                      {formatDays(stage.avgDaysInStage)}
                    </Badge>
                  </div>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full")}
                    style={{
                      width: `${Math.max(share, stage.count > 0 ? 4 : 0)}%`,
                      backgroundColor: `var(--chart-${(index % 5) + 1})`,
                    }}
                  />
                </div>
              </div>
              </Link>
            </DashboardDetailListRow>
          );
        })}
      </DashboardDetailList>
    </DashboardSectionCard>
  );
}
