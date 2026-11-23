"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectUpdatesFeed } from "@/features/project-updates/components/project-updates-feed";
import { ProjectFilesList } from "@/features/projects/components/project-files-list";
import { useProject, useProjectFiles } from "@/features/projects/hooks";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import type { Project } from "@/features/projects/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type DetailTab = "updates" | "files";

/**
 * Project detail: key facts, the updates feed and the project's files.
 * Opened from a projects row or a `/projects?id=<id>` link.
 */
export function ProjectDetailDrawer({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(projectId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Keyed so the tab and drafts reset when another project opens. */}
        {projectId ? <ProjectDetail key={projectId} projectId={projectId} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function ProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, isLoading, isError, refetch, isFetching } = useProject(projectId);
  const [tab, setTab] = useState<DetailTab>("updates");

  if (isLoading) {
    return (
      <div className="space-y-4 p-6" aria-busy="true">
        <SheetHeader className="p-0">
          <SheetTitle className="sr-only">Loading project</SheetTitle>
        </SheetHeader>
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="space-y-4 p-6">
        <SheetHeader className="p-0 text-left">
          <SheetTitle>Project unavailable</SheetTitle>
          <SheetDescription>
            This project could not be loaded. It may have been deleted.
          </SheetDescription>
        </SheetHeader>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? "Retrying…" : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <>
      <ProjectDetailHeader project={project} tab={tab} onTabChange={setTab} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 py-4 pb-8 sm:px-6" role="tabpanel">
          {tab === "updates" ? (
            <ProjectUpdatesFeed projectId={project.id} />
          ) : (
            <ProjectFilesList projectId={project.id} />
          )}
        </div>
      </div>
    </>
  );
}

function ProjectDetailHeader({
  project,
  tab,
  onTabChange,
}: {
  project: Project;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  const { can } = usePermissions();
  const openEditDialog = useProjectUiStore((s) => s.openEditDialog);
  const files = useProjectFiles(project.id);
  const fileCount = files.data?.length;
  const tabs: { id: DetailTab; label: string }[] = [
    { id: "updates", label: "Updates" },
    { id: "files", label: fileCount ? `Files · ${fileCount}` : "Files" },
  ];

  return (
    <SheetHeader className="shrink-0 space-y-3 border-b border-border/60 px-4 pt-6 pr-12 pb-0 text-left sm:px-6 sm:pr-12">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTitle className="text-lg leading-tight">{project.name}</SheetTitle>
          {!project.isActive ? (
            <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
              Inactive
            </span>
          ) : null}
        </div>
        <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <AppIcons.developers className="size-3.5" />
            {project.developer.name}
          </span>
          {project.location ? (
            <span className="inline-flex items-center gap-1">
              <AppIcons.building className="size-3.5" />
              {project.location}
            </span>
          ) : null}
          <Link
            href={`/leads?projectId=${encodeURIComponent(project.id)}`}
            className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
          >
            <AppIcons.leads className="size-3.5" />
            {formatNumber(project.interestedLeadCount)} interested{" "}
            {project.interestedLeadCount === 1 ? "lead" : "leads"}
          </Link>
        </SheetDescription>
      </div>

      {can("project.update") ? (
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openEditDialog(project.id)}
          >
            <AppIcons.edit className="size-3.5" />
            Edit project
          </Button>
        </div>
      ) : null}

      <div className="-mb-px flex gap-5" role="tablist" aria-label="Project sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "border-b-2 pb-2.5 text-sm transition-colors duration-fast ease-enter",
              tab === item.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </SheetHeader>
  );
}
