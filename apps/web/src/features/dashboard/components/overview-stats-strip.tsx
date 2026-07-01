import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import type { DashboardOverviewData } from "@/features/dashboard/types";
import { formatDays, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { dashboardEnterStyle } from "../utils";

interface OverviewStatsStripProps {
  overview: DashboardOverviewData;
}

const stats = [
  {
    key: "activePipelines",
    label: "Pipelines",
    icon: AppIcons.pipelines,
    href: "/pipelines",
    format: formatNumber,
  },
  {
    key: "activeProjects",
    label: "Projects",
    icon: AppIcons.projects,
    href: "/projects",
    format: formatNumber,
  },
  {
    key: "developers",
    label: "Developers",
    icon: AppIcons.developers,
    href: "/developers",
    format: formatNumber,
  },
  {
    key: "importsToday",
    label: "Imports today",
    icon: AppIcons.imports,
    href: "/imports",
    format: formatNumber,
  },
  {
    key: "exportsToday",
    label: "Exports today",
    icon: AppIcons.exports,
    href: "/exports",
    format: formatNumber,
  },
  {
    key: "avgLeadAgeDays",
    label: "Avg lead age",
    icon: AppIcons.clock,
    href: "/leads",
    format: (value: number | null) => formatDays(value),
  },
] as const;

export function OverviewStatsStrip({ overview }: OverviewStatsStripProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const rawValue = overview[stat.key];
        const display =
          stat.key === "avgLeadAgeDays"
            ? stat.format(rawValue as number | null)
            : stat.format(rawValue as number);

        return (
          <Link
            key={stat.key}
            href={stat.href}
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-xs transition-shadow duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={dashboardEnterStyle(index + 6)}
          >
            <Icon className="size-3.5 text-muted-foreground" stroke={2} />
            <span className="text-muted-foreground">{stat.label}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
              {display}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
