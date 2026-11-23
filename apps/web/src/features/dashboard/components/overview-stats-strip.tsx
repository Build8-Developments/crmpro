import Link from "next/link";
import type { DashboardOverviewData } from "@/features/dashboard/types";
import { formatDays, formatNumber } from "@/lib/format";

interface OverviewStatsStripProps {
  overview: DashboardOverviewData;
}

const stats = [
  {
    key: "activePipelines" as const,
    label: "Pipelines",
    href: "/settings/pipelines",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "activeProjects" as const,
    label: "Projects",
    href: "/projects",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "developers" as const,
    label: "Developers",
    href: "/developers",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "importsToday" as const,
    label: "Imports",
    href: "/imports",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "exportsToday" as const,
    label: "Exports",
    href: "/exports",
    format: (v: number) => formatNumber(v),
  },
  {
    key: "avgLeadAgeDays" as const,
    label: "Avg age",
    href: "/leads",
    format: (v: number | null) => formatDays(v),
  },
] as const;

export function OverviewStatsStrip({ overview }: OverviewStatsStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 px-3.5 py-2.5">
      {stats.map((stat) => {
        const raw = overview[stat.key];
        const display =
          stat.key === "avgLeadAgeDays"
            ? stat.format(raw as number | null)
            : stat.format(raw as number);

        return (
          <Link
            key={stat.key}
            href={stat.href}
            className="inline-flex items-baseline gap-1.5 text-[11px] transition-colors hover:text-foreground"
          >
            <span className="text-muted-foreground">{stat.label}</span>
            <span className="font-medium tabular-nums text-foreground">
              {display}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
