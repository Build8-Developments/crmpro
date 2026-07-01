import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import type { LeadStatusDistribution } from "@/features/dashboard/types";
import { dashboardLeadLinks } from "@/features/dashboard/dashboard-links";
import { formatNumber, formatPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface StatusDistributionPanelProps {
  status: LeadStatusDistribution;
}

const segments = [
  {
    key: "open",
    label: "Open",
    color: "var(--chart-1)",
    href: dashboardLeadLinks.open,
  },
  {
    key: "won",
    label: "Won",
    color: "var(--chart-2)",
    href: dashboardLeadLinks.all,
  },
  {
    key: "lost",
    label: "Lost",
    color: "var(--chart-4)",
    href: dashboardLeadLinks.all,
  },
  {
    key: "archived",
    label: "Archived",
    color: "var(--chart-5)",
    href: "/leads?status=ARCHIVED",
  },
] as const;

export function StatusDistributionPanel({ status }: StatusDistributionPanelProps) {
  const total =
    status.open + status.won + status.lost + status.archived;

  return (
    <DashboardSectionCard
      icon={AppIcons.leads}
      title="Lead Status"
      subtitle="Current snapshot across all leads"
      badges={
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
          {formatNumber(total)} total
        </Badge>
      }
      style={dashboardEnterStyle(9)}
      contentClassName="space-y-3"
    >
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.map((segment) => {
          const count = status[segment.key];
          const share = total > 0 ? (count / total) * 100 : 0;
          if (share <= 0) return null;

          return (
            <div
              key={segment.key}
              className="h-full"
              style={{
                width: `${share}%`,
                backgroundColor: segment.color,
              }}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {segments.map((segment, index) => {
          const count = status[segment.key];
          const share = total > 0 ? (count / total) * 100 : 0;

          return (
            <Link
              key={segment.key}
              href={segment.href}
              className="rounded-lg border bg-muted/20 px-2.5 py-2 transition-colors duration-150 hover:bg-muted/40"
              style={dashboardEnterStyle(index + 10)}
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
              <p className={cn("text-[10px] tabular-nums text-muted-foreground")}>
                {formatPercent(share)}
              </p>
            </Link>
          );
        })}
      </div>
    </DashboardSectionCard>
  );
}
