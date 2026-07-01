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
      title: "Total Leads",
      value: formatNumber(overview.totalLeads),
      badge: `+${formatNumber(overview.newThisMonth)} this mo`,
      icon: AppIcons.leads,
      tone: "default" as const,
      href: dashboardLeadLinks.all,
    },
    {
      title: "Open Leads",
      value: formatNumber(overview.openLeads),
      badge: `+${formatNumber(overview.newThisWeek)} this wk`,
      icon: AppIcons.progress,
      tone: "default" as const,
      href: dashboardLeadLinks.open,
    },
    {
      title: "Conversion",
      value: formatPercent(overview.conversionRate),
      badge: `${formatNumber(overview.wonLeads)}W · ${formatNumber(overview.lostLeads)}L`,
      icon: AppIcons.percentage,
      tone: overview.conversionRate >= 20 ? ("success" as const) : ("default" as const),
      href: dashboardLeadLinks.all,
    },
    {
      title: "Response Time",
      value: formatHours(overview.avgResponseTimeHours),
      badge: overview.newToday > 0 ? `${formatNumber(overview.newToday)} today` : "Avg",
      icon: AppIcons.clock,
      tone: "default" as const,
      href: dashboardLeadLinks.stale,
    },
    {
      title: "Stale Leads",
      value: formatNumber(overview.staleLeads),
      badge: overview.staleLeads > 0 ? "Needs follow-up" : "All fresh",
      icon: AppIcons.alertTriangle,
      tone: overview.staleLeads > 0 ? ("warning" as const) : ("default" as const),
      href: dashboardLeadLinks.stale,
    },
    {
      title: "Unassigned",
      value: formatNumber(overview.unassignedLeads),
      badge: overview.unassignedLeads > 0 ? "Action needed" : "Fully owned",
      icon: AppIcons.userQuestion,
      tone: overview.unassignedLeads > 0 ? ("warning" as const) : ("default" as const),
      href: dashboardLeadLinks.unassigned,
    },
  ];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {items.map((item, index) => (
          <KpiCard key={item.title} {...item} index={index} />
        ))}
      </div>
      <OverviewStatsStrip overview={overview} />
    </div>
  );
}
