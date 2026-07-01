"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppIcons } from "@/components/icons/app-icons";
import type { TrendAnalyticsData } from "@/features/dashboard/types";
import { formatChartDate, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardDetailList, DashboardDetailListRow } from "./dashboard-detail-list";
import { DashboardSectionCard } from "./dashboard-section-card";
import { DASHBOARD_CHART_HEIGHT, dashboardEnterStyle } from "../utils";

interface TrendsChartProps {
  trends: TrendAnalyticsData;
  listPanelHeight: number;
  listRowCount: number;
}

interface DailyTrendRow {
  date: string;
  created: number;
  closed: number;
}

function buildChartData(trends: TrendAnalyticsData): DailyTrendRow[] {
  const dateMap = new Map<string, DailyTrendRow>();

  for (const point of trends.leadCreation) {
    dateMap.set(point.date, {
      date: point.date,
      created: point.count,
      closed: 0,
    });
  }

  for (const point of trends.leadClosing) {
    const existing = dateMap.get(point.date);
    if (existing) {
      existing.closed = point.count;
    } else {
      dateMap.set(point.date, {
        date: point.date,
        created: 0,
        closed: point.count,
      });
    }
  }

  return [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function findPeakDay(rows: DailyTrendRow[]): DailyTrendRow | null {
  if (rows.length === 0) return null;

  return rows.reduce((best, row) =>
    row.created > best.created ? row : best,
  );
}

const RECENT_DAYS_LIMIT = 7;

export function TrendsChart({
  trends,
  listPanelHeight,
  listRowCount,
}: TrendsChartProps) {
  const chartData = buildChartData(trends);

  const totalCreated = trends.leadCreation.reduce(
    (sum, point) => sum + point.count,
    0,
  );
  const totalClosed = trends.leadClosing.reduce(
    (sum, point) => sum + point.count,
    0,
  );
  const activeDays = chartData.filter(
    (day) => day.created > 0 || day.closed > 0,
  ).length;
  const avgPerDay =
    activeDays > 0 ? Math.round((totalCreated / activeDays) * 10) / 10 : 0;
  const netVelocity = totalCreated - totalClosed;
  const hasClosing = totalClosed > 0;
  const peakDay = findPeakDay(chartData);
  const maxDailyCreated = Math.max(...chartData.map((day) => day.created), 1);

  const recentDays = [...chartData]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_DAYS_LIMIT);

  return (
    <DashboardSectionCard
      icon={AppIcons.trendingUp}
      title="Lead Trends"
      subtitle="Daily creation & won closings"
      badges={
        <>
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] tabular-nums"
          >
            <span className="size-1.5 rounded-full bg-[var(--chart-1)]" />
            {formatNumber(totalCreated)} new
          </Badge>
          {hasClosing ? (
            <Badge
              variant="outline"
              className="h-5 gap-1 px-1.5 text-[10px] tabular-nums"
            >
              <span className="size-1.5 rounded-full bg-[var(--chart-2)]" />
              {formatNumber(totalClosed)} won
            </Badge>
          ) : null}
          {peakDay && peakDay.created > 0 ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              Peak {formatChartDate(peakDay.date)}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[10px] tabular-nums",
              netVelocity > 0 && "text-primary",
              netVelocity < 0 && "text-destructive",
            )}
          >
            {netVelocity > 0 ? "+" : ""}
            {formatNumber(netVelocity)} net
          </Badge>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
            ~{avgPerDay}/day
          </Badge>
        </>
      }
      style={dashboardEnterStyle(3)}
      className="h-full"
      contentClassName="flex h-full flex-col gap-2.5 pt-2.5"
    >
      <div
        className="w-full min-w-0 shrink-0"
        style={{ height: DASHBOARD_CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="closedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/50"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickFormatter={formatChartDate}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={28}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                    <p className="mb-1 font-medium">
                      {formatChartDate(String(label))}
                    </p>
                    {payload.map((entry, entryIndex) => (
                      <p
                        key={String(entry.dataKey ?? entryIndex)}
                        className="text-muted-foreground"
                        style={{ color: entry.color }}
                      >
                        {entry.name}: {formatNumber(Number(entry.value ?? 0))}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="created"
              name="Leads Created"
              stroke="var(--chart-1)"
              fill="url(#createdGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            {hasClosing ? (
              <Area
                type="monotone"
                dataKey="closed"
                name="Leads Closed"
                stroke="var(--chart-2)"
                fill="url(#closedGradient)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DashboardDetailList
        height={listPanelHeight}
        rowCount={listRowCount}
        title={`Last ${RECENT_DAYS_LIMIT} days`}
        legend={
          <>
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-[var(--chart-1)]" />
              New
            </span>
            {hasClosing ? (
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[var(--chart-2)]" />
                Won
              </span>
            ) : null}
          </>
        }
      >
        {recentDays.map((day) => {
          const createdShare =
            maxDailyCreated > 0 ? (day.created / maxDailyCreated) * 100 : 0;
          const isPeak = peakDay?.date === day.date && day.created > 0;

          return (
            <DashboardDetailListRow key={day.date}>
              <div className="w-12 shrink-0">
                <p className="text-[11px] font-medium tabular-nums text-foreground">
                  {formatChartDate(day.date)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-end gap-1">
                  <Badge
                    variant="secondary"
                    className="h-5 gap-1 px-1.5 text-[10px] tabular-nums"
                  >
                    <span className="size-1.5 rounded-full bg-[var(--chart-1)]" />
                    {formatNumber(day.created)}
                  </Badge>
                  {hasClosing ? (
                    <Badge
                      variant="outline"
                      className="h-5 gap-1 px-1.5 text-[10px] tabular-nums"
                    >
                      <span className="size-1.5 rounded-full bg-[var(--chart-2)]" />
                      {formatNumber(day.closed)}
                    </Badge>
                  ) : null}
                  {isPeak ? (
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                      Peak
                    </Badge>
                  ) : null}
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(createdShare, day.created > 0 ? 4 : 0)}%`,
                      backgroundColor: "var(--chart-1)",
                    }}
                  />
                </div>
              </div>
            </DashboardDetailListRow>
          );
        })}
      </DashboardDetailList>
    </DashboardSectionCard>
  );
}
