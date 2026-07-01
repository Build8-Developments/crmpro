import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import type { DeveloperPerformanceAnalytics } from "@/features/dashboard/types";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface DeveloperPerformancePanelProps {
  developers: DeveloperPerformanceAnalytics[];
}

export function DeveloperPerformancePanel({
  developers,
}: DeveloperPerformancePanelProps) {
  const topDevelopers = developers.slice(0, 6);

  return (
    <DashboardSectionCard
      icon={AppIcons.developers}
      title="Developers"
      subtitle="Catalog interest overview"
      badges={
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
          {formatNumber(topDevelopers.length)} active
        </Badge>
      }
      style={dashboardEnterStyle(8)}
      contentClassName="p-0"
    >
      <div className="divide-y divide-border/50">
        {topDevelopers.map((developer, index) => (
          <Link
            key={developer.developerId}
            href={`/developers?developerId=${developer.developerId}&search=${encodeURIComponent(developer.developerName)}`}
            className="flex items-center gap-2.5 px-3.5 py-2 transition-colors duration-150 hover:bg-muted/30"
            style={dashboardEnterStyle(index + 9)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-foreground">
                  {developer.developerName}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-[10px] tabular-nums"
                  >
                    {formatNumber(developer.projects)} proj
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] tabular-nums"
                  >
                    {formatNumber(developer.interestedLeads)} leads
                  </Badge>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardSectionCard>
  );
}
