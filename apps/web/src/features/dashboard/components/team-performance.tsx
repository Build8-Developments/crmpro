import { AppIcons } from "@/components/icons/app-icons";
import type { TeamAnalyticsData } from "@/features/dashboard/types";
import { formatNumber, formatPercent, getInitials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface TeamPerformanceProps {
  team: TeamAnalyticsData;
}

function rankBadgeVariant(index: number): "default" | "secondary" | "outline" {
  if (index === 0) return "default";
  if (index === 1) return "secondary";
  return "outline";
}

export function TeamPerformance({ team }: TeamPerformanceProps) {
  const topConversion = team.topPerformers[0]?.conversionRate ?? 0;

  return (
    <DashboardSectionCard
      icon={AppIcons.team}
      title="Top Performers"
      subtitle="By assigned leads"
      badges={
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
          Top {formatNumber(team.topPerformers.length)}
        </Badge>
      }
      style={dashboardEnterStyle(4)}
      contentClassName="p-0"
    >
      <div className="divide-y divide-border/50">
        {team.topPerformers.map((performer, index) => (
          <div
            key={performer.userId}
            className="flex items-center gap-2.5 px-3.5 py-2 transition-colors duration-150 hover:bg-muted/30"
            style={dashboardEnterStyle(index + 5)}
          >
            <Badge
              variant={rankBadgeVariant(index)}
              className="size-5 shrink-0 justify-center rounded-full p-0 text-[10px] font-bold tabular-nums"
            >
              {index + 1}
            </Badge>
            <Avatar size="sm" className="size-7">
              <AvatarFallback
                className={cn(
                  "text-[10px] font-semibold",
                  index === 0
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {getInitials(performer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-foreground">
                  {performer.name}
                </p>
                {performer.conversionRate === topConversion &&
                topConversion > 0 ? (
                  <Badge
                    variant="secondary"
                    className="h-5 shrink-0 px-1.5 text-[10px]"
                  >
                    Best rate
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge
                  variant="outline"
                  className="h-5 gap-1 px-1.5 text-[10px] tabular-nums"
                >
                  <AppIcons.leads className="size-2.5" />
                  {formatNumber(performer.assignedLeads)}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 gap-1 px-1.5 text-[10px] tabular-nums"
                >
                  <AppIcons.check className="size-2.5" />
                  {formatNumber(performer.wonLeads)} won
                </Badge>
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] tabular-nums"
                >
                  {formatPercent(performer.conversionRate)}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardSectionCard>
  );
}
