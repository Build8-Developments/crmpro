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
import { Badge } from "@/components/ui/badge";
import { DashboardSectionCard } from "@/features/dashboard/components/dashboard-section-card";
import { formatCompactMoney } from "@/features/targets/utils/target-format";
import { formatChartDate } from "@/lib/format";
import type { DashboardMoney } from "./money-types";

interface MoneyTrendChartProps {
  trend: DashboardMoney["trend"];
  currency: string;
  previousLabel: string;
}

/** Contracted revenue per day (or week) vs the same bucket of the previous window. */
export function MoneyTrendChart({ trend, currency, previousLabel }: MoneyTrendChartProps) {
  const total = trend.points.reduce((sum, point) => sum + point.current, 0);
  const previousTotal = trend.points.reduce((sum, point) => sum + point.previous, 0);
  const empty = total === 0 && previousTotal === 0;
  const unit = trend.granularity === "day" ? "Daily" : "Weekly";

  return (
    <DashboardSectionCard
      icon={AppIcons.trendingUp}
      title="Revenue trend"
      subtitle={`${unit} contracted revenue, ${previousLabel}`}
      badges={
        <>
          <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px] tabular-nums">
            <span className="size-1.5 rounded-full bg-[var(--chart-1)]" />
            {formatCompactMoney(total, currency)}
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] tabular-nums">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            {formatCompactMoney(previousTotal, currency)}
          </Badge>
        </>
      }
      className="h-full"
      contentClassName="pt-2.5"
    >
      {empty ? (
        <p className="flex h-44 items-center justify-center text-xs text-muted-foreground">
          No contracted revenue in either period.
        </p>
      ) : (
        <div className="h-44 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend.points} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="moneyCurrentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
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
                width={44}
                tickFormatter={(value: number) => formatCompactMoney(value, "").trim()}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as DashboardMoney["trend"]["points"][number] | undefined;
                  if (!active || !point) return null;
                  const prefix = trend.granularity === "week" ? "Week of " : "";
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <p className="font-medium">
                        {prefix}
                        {formatChartDate(point.date)}: {formatCompactMoney(point.current, currency)}
                      </p>
                      <p className="text-muted-foreground">
                        {prefix}
                        {formatChartDate(point.previousDate)}: {formatCompactMoney(point.previous, currency)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="previous"
                name="Previous"
                stroke="var(--muted-foreground)"
                strokeOpacity={0.5}
                strokeDasharray="4 3"
                fill="none"
                strokeWidth={1.5}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="current"
                name="This period"
                stroke="var(--chart-1)"
                fill="url(#moneyCurrentGradient)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardSectionCard>
  );
}
