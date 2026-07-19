import { AppIcons } from "@/components/icons/app-icons";
import type { DashboardOverviewData } from "@/features/dashboard/types";
import { dashboardLeadLinks } from "@/features/dashboard/dashboard-links";
import { formatHours, formatNumber, formatPercent } from "@/lib/format";
import { KpiCard } from "./kpi-card";
import { OverviewStatsStrip } from "./overview-stats-strip";

interface KpiGridProps {
  overview: DashboardOverviewData;
}

export function KpiGrid({ overview }: KpiGridProps) {
  const items = [
    {
      title: "Total leads",
      value: formatNumber(overview.totalLeads),
      badge: `+${formatNumber(overview.newThisMonth)} this month`,
      icon: AppIcons.leads,
      tone: "default" as const,
      href: dashboardLeadLinks.all,
    },
    {
      title: "Open",
      value: formatNumber(overview.openLeads),
      badge: `+${formatNumber(overview.newThisWeek)} this week`,
      icon: AppIcons.progress,
      tone: "default" as const,
      href: dashboardLeadLinks.open,
    },
    {
      title: "Conversion",
      value: formatPercent(overview.conversionRate),
      badge: `${formatNumber(overview.wonLeads)} won · ${formatNumber(overview.lostLeads)} lost`,
      icon: AppIcons.percentage,
      tone:
        overview.conversionRate >= 20
          ? ("success" as const)
          : ("default" as const),
      href: dashboardLeadLinks.all,
    },
    {
      title: "Response",
      value: formatHours(overview.avgResponseTimeHours),
      badge:
        overview.newToday > 0
          ? `${formatNumber(overview.newToday)} today`
          : "Average first response",
      icon: AppIcons.clock,
      tone: "default" as const,
      href: dashboardLeadLinks.stale,
    },
    {
      title: "Stale",
      value: formatNumber(overview.staleLeads),
      badge: overview.staleLeads > 0 ? "Needs follow-up" : "All fresh",
      icon: AppIcons.alertTriangle,
      tone:
        overview.staleLeads > 0 ? ("warning" as const) : ("default" as const),
      href: dashboardLeadLinks.stale,
    },
    {
      title: "Unassigned",
      value: formatNumber(overview.unassignedLeads),
      badge:
        overview.unassignedLeads > 0 ? "Action needed" : "Fully owned",
      icon: AppIcons.userQuestion,
      tone:
        overview.unassignedLeads > 0
          ? ("warning" as const)
          : ("default" as const),
      href: dashboardLeadLinks.unassigned,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="grid grid-cols-2 divide-x divide-y divide-border/50 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        {items.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </div>
      <OverviewStatsStrip overview={overview} />
    </div>
  );
}
