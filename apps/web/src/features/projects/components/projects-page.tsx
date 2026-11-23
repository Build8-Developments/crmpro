"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateProjectDialog } from "@/features/projects/components/create-project-dialog";
import { DeleteProjectDialog } from "@/features/projects/components/delete-project-dialog";
import { EditProjectDialog } from "@/features/projects/components/edit-project-dialog";
import { ProjectDetailDrawer } from "@/features/projects/components/project-detail-drawer";
import { ProjectsEmptyState } from "@/features/projects/components/projects-empty-state";
import { ProjectsHeader } from "@/features/projects/components/projects-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ProjectsSkeleton } from "@/features/projects/components/projects-skeleton";
import { ProjectsTable } from "@/features/projects/components/projects-table";
import { ProjectsToolbar } from "@/features/projects/components/projects-toolbar";
import { useProjectDeveloperOptions } from "@/features/projects/hooks/use-project-developer-options";
import { useProjectDetailUrl } from "@/features/projects/hooks/use-project-detail-url";
import { useProjectsUrlState } from "@/features/projects/hooks/use-projects-url-state";
import { useProjects } from "@/features/projects/hooks";
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import type {
  ProjectStatusFilter,
  ProjectsSortField,
} from "@/features/projects/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const PROJECTS_PAGE_SIZE = 50;

export function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ProjectsSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [developerId, setDeveloperId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  const highlightedProjectId = useProjectUiStore((s) => s.highlightedProjectId);
  const setHighlightedProjectId = useProjectUiStore(
    (s) => s.setHighlightedProjectId,
  );

  useProjectsUrlState({
    debouncedSearch,
    setSearch,
    developerId,
    setDeveloperId,
    statusFilter,
    setStatusFilter,
    highlightedProjectId,
    setHighlightedProjectId,
  });

  const {
    projectId: detailProjectId,
    openProject,
    closeProject,
  } = useProjectDetailUrl();

  const { data: developersData, isLoading: developersLoading } =
    useProjectDeveloperOptions();

  const { data, isLoading, isError, isFetching, refetch } = useProjects({
    page,
    limit: PROJECTS_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    developerId: developerId ?? undefined,
    isActive:
      statusFilter === "all"
        ? undefined
        : statusFilter === "active"
          ? true
          : false,
    sortBy,
    sortOrder,
  });

  const projects = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 ||
    developerId !== null ||
    statusFilter !== "all";
  const isEmpty = projects.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleDeveloperIdChange = (value: string | null) => {
    setDeveloperId(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: ProjectStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setDeveloperId(null);
    setStatusFilter("all");
    setPage(1);
  };

  const handleSortChange = (
    nextSortBy: ProjectsSortField,
    nextSortOrder: "asc" | "desc",
  ) => {
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  if (isLoading && !data) {
    return <ProjectsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <ProjectsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load projects
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your projects catalog. Check your
              connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <ProjectsHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <ProjectsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          developerId={developerId}
          onDeveloperIdChange={handleDeveloperIdChange}
          developerOptions={developersData?.items ?? []}
          developersLoading={developersLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? projects.length}
          isFetching={isFetching}
        />

        {isEmpty ? (
          <ProjectsEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <ProjectsTable
              projects={projects}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              highlightedProjectId={detailProjectId ?? highlightedProjectId}
              onOpenProject={openProject}
            />
            {pagination ? (
              <DataTablePagination
                pagination={pagination}
                onPageChange={setPage}
                itemLabel="projects"
                hideOnSinglePage
              />
            ) : null}
          </>
        )}
      </div>

      <CreateProjectDialog defaultDeveloperId={developerId} />
      <EditProjectDialog />
      <DeleteProjectDialog />
      <ProjectDetailDrawer projectId={detailProjectId} onClose={closeProject} />
    </div>
  );
}
