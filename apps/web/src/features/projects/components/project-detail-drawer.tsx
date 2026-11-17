"use client";

import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectUpdatesPanel } from "@/features/project-updates/components/project-updates-panel";
import { ProjectFilesPanel } from "@/features/projects/components/project-files-panel";
import { useProject } from "@/features/projects/hooks";
import {
  useProjectUiStore,
  type ProjectDetailTab,
} from "@/features/projects/stores/project-ui-store";
import { cn } from "@/lib/utils";

const TABS: ProjectDetailTab[] = ["updates", "files"];

export function ProjectDetailDrawer() {
  const t = useTranslations("projectDetail");
  const projectId = useProjectUiStore((s) => s.detailProjectId);
  const tab = useProjectUiStore((s) => s.detailTab);
  const setTab = useProjectUiStore((s) => s.setDetailTab);
  const close = useProjectUiStore((s) => s.closeDetail);
  const { data: project, isLoading } = useProject(projectId ?? undefined);

  return (
    <Sheet open={Boolean(projectId)} onOpenChange={(open) => !open && close()}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 space-y-2 border-b border-border/60 px-6 pt-6 pb-0 pe-12 text-start">
          {isLoading || !project ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <>
              <SheetTitle className="text-lg leading-tight">{project.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{project.developer.name}</span>
                {project.location ? (
                  <span className="inline-flex items-center gap-1">
                    <AppIcons.mapPin className="size-3" />
                    {project.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <AppIcons.leads className="size-3" />
                  {t("interestedLeads", { count: project.interestedLeadCount ?? 0 })}
                </span>
              </SheetDescription>
            </>
          )}
          <nav className="-mb-px flex gap-4 pt-2" role="tablist">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={cn(
                  "border-b-2 pb-2 text-sm transition-colors",
                  tab === item
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${item}`)}
              </button>
            ))}
          </nav>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {projectId ? (
            tab === "updates" ? (
              <ProjectUpdatesPanel projectId={projectId} />
            ) : (
              <ProjectFilesPanel projectId={projectId} />
            )
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
