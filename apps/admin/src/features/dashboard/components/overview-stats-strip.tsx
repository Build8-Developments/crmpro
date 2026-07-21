import Link from "next/link";
import type { PlatformAnalyticsDashboardData } from "@/features/dashboard/types";
import { formatNumber } from "@/lib/format";

interface OverviewStatsStripProps {
  data: PlatformAnalyticsDashboardData;
}

const stats = [
  {
    key: "trial",
    label: "Trial",
    href: "/tenants?status=TRIAL",
    getValue: (data: PlatformAnalyticsDashboardData) => data.tenants.trial,
  },
  {
    key: "suspended",
    label: "Suspended",
    href: "/tenants?status=SUSPENDED",
    getValue: (data: PlatformAnalyticsDashboardData) => data.tenants.suspended,
  },
  {
    key: "plans",
    label: "Plans",
    href: "/plans?status=active",
    getValue: (data: PlatformAnalyticsDashboardData) => data.plans.active,
  },
  {
    key: "activeContracts",
    label: "Active contracts",
    href: "/contracts?status=ACTIVE",
    getValue: (data: PlatformAnalyticsDashboardData) => data.contracts.active,
  },
  {
    key: "draftContracts",
    label: "Draft contracts",
    href: "/contracts?status=DRAFT",
    getValue: (data: PlatformAnalyticsDashboardData) => data.contracts.draft,
  },
] as const;

export function OverviewStatsStrip({ data }: OverviewStatsStripProps) {
  const dbUp = data.systemHealth.database === "up";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 px-3.5 py-2.5">
      {stats.map((stat) => (
        <Link
          key={stat.key}
          href={stat.href}
          className="inline-flex items-baseline gap-1.5 text-[11px] transition-colors hover:text-foreground"
        >
          <span className="text-muted-foreground">{stat.label}</span>
          <span className="font-medium tabular-nums text-foreground">
            {formatNumber(stat.getValue(data))}
          </span>
        </Link>
      ))}
      <span className="inline-flex items-baseline gap-1.5 text-[11px]">
        <span className="text-muted-foreground">DB</span>
        <span
          className={
            dbUp
              ? "font-medium text-emerald-700 dark:text-emerald-400"
              : "font-medium text-amber-700 dark:text-amber-400"
          }
        >
          {dbUp ? "up" : "down"}
        </span>
      </span>
    </div>
  );
}
