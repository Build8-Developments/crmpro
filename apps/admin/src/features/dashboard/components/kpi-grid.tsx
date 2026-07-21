import { AppIcons } from "@/components/icons/app-icons";
import type { PlatformAnalyticsDashboardData } from "@/features/dashboard/types";
import { formatMoney, formatNumber } from "@/lib/format";
import { KpiCard } from "./kpi-card";
import { OverviewStatsStrip } from "./overview-stats-strip";
import { RevenueStrip } from "./revenue-strip";

interface KpiGridProps {
  data: PlatformAnalyticsDashboardData;
}

export function KpiGrid({ data }: KpiGridProps) {
  const failedImports =
    data.importActivity.byStatus.FAILED +
    data.importActivity.byStatus.PARTIAL_SUCCESS;
  const usageAtRisk = data.attention.usageAtRiskTenants.length;
  const primaryMrr = data.revenue.mrrByCurrency[0];

  const items = [
    {
      title: "MRR",
      value: primaryMrr
        ? formatMoney(primaryMrr.mrr, primaryMrr.currency)
        : "—",
      badge: primaryMrr
        ? `${formatNumber(primaryMrr.contractCount)} active contracts`
        : "No active contracts",
      icon: AppIcons.trendingUp,
      tone: primaryMrr ? ("success" as const) : ("default" as const),
      href: "/contracts?status=ACTIVE",
    },
    {
      title: "Suspended",
      value: formatNumber(data.tenants.suspended),
      badge:
        data.tenants.suspended > 0
          ? "Needs reactivation review"
          : "None locked out",
      icon: AppIcons.buildingOff,
      tone:
        data.tenants.suspended > 0
          ? ("warning" as const)
          : ("success" as const),
      href: "/tenants?status=SUSPENDED",
    },
    {
      title: "Near limits",
      value: formatNumber(usageAtRisk),
      badge:
        usageAtRisk > 0 ? "≥90% of plan usage" : "All within headroom",
      icon: AppIcons.percentage,
      tone: usageAtRisk > 0 ? ("warning" as const) : ("default" as const),
      href: "/dashboard",
    },
    {
      title: "Failed imports",
      value: formatNumber(failedImports),
      badge: `${formatNumber(data.importActivity.last7d)} jobs in 7d`,
      icon: AppIcons.alertTriangle,
      tone: failedImports > 0 ? ("warning" as const) : ("default" as const),
      href: "/imports",
    },
    {
      title: "On trial",
      value: formatNumber(data.tenants.trial),
      badge: `${formatNumber(data.tenants.active)} active paying`,
      icon: AppIcons.clock,
      tone: data.tenants.trial > 0 ? ("warning" as const) : ("default" as const),
      href: "/tenants?status=TRIAL",
    },
    {
      title: "Draft contracts",
      value: formatNumber(data.contracts.draft),
      badge: `${formatNumber(data.contracts.active)} live`,
      icon: AppIcons.files,
      tone:
        data.contracts.draft > 0 ? ("warning" as const) : ("default" as const),
      href: "/contracts?status=DRAFT",
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        {items.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </div>
      <RevenueStrip revenue={data.revenue} />
      <OverviewStatsStrip data={data} />
    </div>
  );
}
