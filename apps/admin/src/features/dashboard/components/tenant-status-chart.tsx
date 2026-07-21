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
import type { PlatformTenantStats } from "@/features/dashboard/types";
import { formatNumber, formatPercent } from "@/lib/format";
import { DashboardSectionCard } from "./dashboard-section-card";
import { DASHBOARD_CHART_HEIGHT, dashboardEnterStyle } from "../utils";

interface TenantStatusChartProps {
  tenants: PlatformTenantStats;
}

const SEGMENTS = [
  {
    key: "active" as const,
    label: "Active",
    color: "var(--chart-2)",
    href: "/tenants?status=ACTIVE",
  },
  {
    key: "trial" as const,
    label: "Trial",
    color: "var(--chart-1)",
    href: "/tenants?status=TRIAL",
  },
  {
    key: "suspended" as const,
    label: "Suspended",
    color: "var(--chart-4)",
    href: "/tenants?status=SUSPENDED",
  },
  {
    key: "cancelled" as const,
    label: "Cancelled",
    color: "var(--chart-5)",
    href: "/tenants?status=CANCELLED",
  },
] as const;

export function TenantStatusChart({ tenants }: TenantStatusChartProps) {
  const chartData = SEGMENTS.map((segment) => ({
    name: segment.label,
    count: tenants[segment.key],
    color: segment.color,
    href: segment.href,
  }));

  const total = tenants.total;
  const maxCount = Math.max(...chartData.map((item) => item.count), 1);

  return (
    <DashboardSectionCard
      icon={AppIcons.building}
      title="Tenant Status"
      subtitle="Distribution across lifecycle states"
      badges={
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
          {formatNumber(total)} total
        </Badge>
      }
      style={dashboardEnterStyle(2)}
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
              width={72}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--foreground)", fontSize: 11 }}
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
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
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

      <div className="grid grid-cols-2 gap-2">
        {SEGMENTS.map((segment, index) => {
          const count = tenants[segment.key];
          const share = total > 0 ? (count / total) * 100 : 0;

          return (
            <Link
              key={segment.key}
              href={segment.href}
              className="rounded-lg border bg-muted/20 px-2.5 py-2 transition-colors duration-150 hover:bg-muted/40"
              style={dashboardEnterStyle(index + 3)}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  {segment.label}
                </span>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] tabular-nums"
                >
                  {formatNumber(count)}
                </Badge>
              </div>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {formatPercent(share)}
              </p>
            </Link>
          );
        })}
      </div>
    </DashboardSectionCard>
  );
}
