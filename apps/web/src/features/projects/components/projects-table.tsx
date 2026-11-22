"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ProjectRowContextMenu } from "@/features/projects/components/project-row-actions";
import { projectColumns } from "@/features/projects/table/columns";
import type { Project, ProjectsSortField } from "@/features/projects/types";

interface ProjectsTableProps {
  projects: Project[];
  sortBy: ProjectsSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: ProjectsSortField, sortOrder: "asc" | "desc") => void;
  highlightedProjectId?: string | null;
  onHighlightProject?: (projectId: string) => void;
}

export function ProjectsTable({
  projects,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedProjectId,
  onHighlightProject,
}: ProjectsTableProps) {
  const table = useDataTable({ data: projects, columns: projectColumns });

  return (
    <DataTable
      table={table}
      minWidth={820}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      highlightedRowId={highlightedProjectId}
      onRowClick={onHighlightProject ? (project) => onHighlightProject(project.id) : undefined}
      rowClassName={(project) => !project.isActive && "opacity-70"}
      aria-label="Projects"
      renderRow={(row, tr) => (
        <ContextMenu>
          <ContextMenuTrigger asChild>{tr}</ContextMenuTrigger>
          <ProjectRowContextMenu project={row.original} />
        </ContextMenu>
      )}
    />
  );
}
