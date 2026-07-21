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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PlatformFailedImportItem,
  PlatformImportActivity,
} from "@/features/dashboard/types";
import { formatNumber, formatPercent, formatRelativeTime } from "@/lib/format";
import { DashboardSectionCard } from "./dashboard-section-card";
import { DASHBOARD_CHART_HEIGHT, dashboardEnterStyle } from "../utils";

interface ImportActivityPanelProps {
  importActivity: PlatformImportActivity;
  failedImports?: PlatformFailedImportItem[];
}

const STATUSES = [
  {
    key: "COMPLETED" as const,
    label: "Completed",
    color: "var(--chart-2)",
  },
  {
    key: "PARTIAL_SUCCESS" as const,
    label: "Partial",
    color: "var(--chart-3)",
  },
  {
    key: "PROCESSING" as const,
    label: "Processing",
    color: "var(--chart-1)",
  },
  {
    key: "PENDING" as const,
    label: "Pending",
    color: "var(--chart-5)",
  },
  {
    key: "FAILED" as const,
    label: "Failed",
    color: "var(--chart-4)",
  },
] as const;

export function ImportActivityPanel({
  importActivity,
  failedImports = [],
}: ImportActivityPanelProps) {
  const chartData = STATUSES.map((status) => ({
    name: status.label,
    count: importActivity.byStatus[status.key],
    color: status.color,
  }));

  const total = chartData.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...chartData.map((item) => item.count), 1);
  const failed = importActivity.byStatus.FAILED;

  return (
    <DashboardSectionCard
      icon={AppIcons.imports}
      title="Import Activity"
      subtitle="Job outcomes across the platform"
      badges={
        <>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
            {formatNumber(importActivity.last7d)} / 7d
          </Badge>
          {failed > 0 ? (
            <Badge variant="warning" className="h-5 px-1.5 text-[10px] tabular-nums">
              {formatNumber(failed)} failed
            </Badge>
          ) : null}
        </>
      }
      style={dashboardEnterStyle(3)}
      className="h-full"
      contentClassName="flex h-full flex-col gap-3"
    >
      <div
        className="w-full min-w-0 shrink-0"
        style={{ height: DASHBOARD_CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/50"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as {
                  name: string;
                  count: number;
                };
                const share = total > 0 ? (row.count / total) * 100 : 0;
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {formatNumber(row.count)} · {formatPercent(share)}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {chartData.map((item) => (
                <Cell
                  key={item.name}
                  fill={item.color}
                  fillOpacity={item.count / maxCount > 0 ? 0.9 : 0.25}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {STATUSES.map((status) => (
          <span
            key={status.key}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            {status.label}
            <span className="font-medium tabular-nums text-foreground">
              {formatNumber(importActivity.byStatus[status.key])}
            </span>
          </span>
        ))}
      </div>

      {failedImports.length > 0 ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent failures
            </p>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" asChild>
              <Link href="/imports">Open all</Link>
            </Button>
          </div>
          <ul className="space-y-1.5">
            {failedImports.slice(0, 3).map((job) => (
              <li key={job.id}>
                <Link
                  href={`/tenants/${job.tenant.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 text-xs transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate font-medium">
                    {job.tenant.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatNumber(job.failedRows)} failed ·{" "}
                    {formatRelativeTime(job.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DashboardSectionCard>
  );
}
