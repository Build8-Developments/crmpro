import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import type { LeadSourceAnalytics } from "@/features/dashboard/types";
import { dashboardLeadLinks } from "@/features/dashboard/dashboard-links";
import { formatNumber, formatPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface LeadSourcesPanelProps {
  sources: LeadSourceAnalytics[];
}

export function LeadSourcesPanel({ sources }: LeadSourcesPanelProps) {
  const topSources = sources.slice(0, 6);
  const maxCount = Math.max(...topSources.map((source) => source.count), 1);

  return (
    <DashboardSectionCard
      icon={AppIcons.leadSources}
      title="Lead Sources"
      subtitle="Performance by acquisition channel"
      badges={
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
          {formatNumber(sources.length)} sources
        </Badge>
      }
      style={dashboardEnterStyle(6)}
      contentClassName="p-0"
    >
      <div className="divide-y divide-border/50">
        {topSources.map((source, index) => {
          const href = source.sourceId
            ? dashboardLeadLinks.source(source.sourceId)
            : dashboardLeadLinks.all;
          const share = (source.count / maxCount) * 100;

          return (
            <Link
              key={`${source.sourceId ?? "unknown"}-${source.sourceName}`}
              href={href}
              className="flex items-center gap-2.5 px-3.5 py-2 transition-colors duration-150 hover:bg-muted/30"
              style={dashboardEnterStyle(index + 7)}
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-foreground">
                    {source.sourceName}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px] tabular-nums"
                    >
                      {formatNumber(source.count)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] tabular-nums"
                    >
                      {formatPercent(source.conversionRate)}
                    </Badge>
                  </div>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full bg-[var(--chart-3)]")}
                    style={{
                      width: `${Math.max(share, source.count > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </DashboardSectionCard>
  );
}
