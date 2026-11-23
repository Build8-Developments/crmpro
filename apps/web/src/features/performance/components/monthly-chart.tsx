"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthPoint } from "@/features/performance/types";
import { PerformanceSection } from "@/features/performance/components/performance-section";
import {
  formatPeriodLabel,
  formatPeriodShort,
} from "@/features/targets/utils/target-format";
import { formatCompactMoney, formatCompactNumber, formatNumber } from "@/lib/format";

const CHART_HEIGHT = 240;

/** Spec §4.1 month-by-month: deals (bars) and contracted revenue (line), last 12 months. */
export function MonthlyChart({ months, currency }: { months: MonthPoint[]; currency: string }) {
  const totals = months.reduce(
    (sum, point) => ({ deals: sum.deals + point.deals, revenue: sum.revenue + point.revenue }),
    { deals: 0, revenue: 0 },
  );
  const empty = totals.deals === 0 && totals.revenue === 0;

  return (
    <PerformanceSection
      title="Last 12 months"
      privateHint
      hint={
        <span className="inline-flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--chart-2)]" />
            {formatNumber(totals.deals)} deals
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 rounded-full bg-[var(--chart-1)]" />
            {formatCompactMoney(totals.revenue, currency)} revenue
          </span>
        </span>
      }
    >
      {empty ? (
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed text-center"
          style={{ height: CHART_HEIGHT }}
        >
          <p className="text-sm font-medium">No deals in the last 12 months yet</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Your deals and contracted revenue will be charted here month by month.
          </p>
        </div>
      ) : (
        <div className="w-full min-w-0" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={months} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                minTickGap={8}
                tickFormatter={(period: string) => formatPeriodShort(period)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="deals"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={28}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(value: number) => formatCompactNumber(value)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as MonthPoint | undefined;
                  if (!point) return null;
                  return (
                    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <p className="mb-1 font-medium">{formatPeriodLabel(String(label))}</p>
                      <p style={{ color: "var(--chart-2)" }}>Deals: {formatNumber(point.deals)}</p>
                      <p style={{ color: "var(--chart-1)" }}>
                        Revenue: {formatCompactMoney(point.revenue, currency)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="deals"
                dataKey="deals"
                name="Deals"
                fill="var(--chart-2)"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
              <Line
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "var(--chart-1)" }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </PerformanceSection>
  );
}
