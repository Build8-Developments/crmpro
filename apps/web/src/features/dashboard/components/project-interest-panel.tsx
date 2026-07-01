import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import type { ProjectPerformanceAnalytics } from "@/features/dashboard/types";
import { formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface ProjectInterestPanelProps {
  projects: ProjectPerformanceAnalytics[];
}

export function ProjectInterestPanel({ projects }: ProjectInterestPanelProps) {
  const topProjects = projects.slice(0, 6);

  return (
    <DashboardSectionCard
      icon={AppIcons.projects}
      title="Project Interest"
      subtitle="Most requested projects"
      badges={
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] tabular-nums">
          Top {formatNumber(topProjects.length)}
        </Badge>
      }
      style={dashboardEnterStyle(7)}
      contentClassName="p-0"
    >
      <div className="divide-y divide-border/50">
        {topProjects.map((project, index) => (
          <Link
            key={project.projectId}
            href={`/projects?projectId=${project.projectId}&search=${encodeURIComponent(project.projectName)}`}
            className="flex items-center gap-2.5 px-3.5 py-2 transition-colors duration-150 hover:bg-muted/30"
            style={dashboardEnterStyle(index + 8)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">
                    {project.projectName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {project.developer}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 gap-1 px-1.5 text-[10px] tabular-nums"
                >
                  <AppIcons.leads className="size-2.5" />
                  {formatNumber(project.interestedLeads)}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardSectionCard>
  );
}
