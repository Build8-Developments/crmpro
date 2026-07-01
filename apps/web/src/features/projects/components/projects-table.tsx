"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { ProjectRowActions } from "@/features/projects/components/project-row-actions";
import type { Project, ProjectsSortField } from "@/features/projects/types";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ProjectsTableProps {
  projects: Project[];
  sortBy: ProjectsSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: ProjectsSortField, sortOrder: "asc" | "desc") => void;
  highlightedProjectId?: string | null;
  onHighlightProject?: (projectId: string) => void;
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortOrder,
  onSortChange,
  className,
}: {
  label: string;
  column: ProjectsSortField;
  sortBy: ProjectsSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: ProjectsSortField, sortOrder: "asc" | "desc") => void;
  className?: string;
}) {
  const isSorted = sortBy === column;

  return (
    <th
      className={cn(
        "h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-0.5 transition-colors hover:text-foreground",
          isSorted && "text-foreground",
        )}
        onClick={() =>
          onSortChange(
            column,
            isSorted && sortOrder === "desc" ? "asc" : "desc",
          )
        }
      >
        {label}
        {isSorted ? (
          <AppIcons.chevronDown
            className={cn("size-3", sortOrder === "asc" && "rotate-180")}
          />
        ) : null}
      </button>
    </th>
  );
}

export function ProjectsTable({
  projects,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedProjectId,
  onHighlightProject,
}: ProjectsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead className="border-b border-border/70 bg-muted/50">
            <tr className="text-left">
              <SortableHeader
                label="Project"
                column="name"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
              <th className="h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Developer
              </th>
              <th className="hidden h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
                Location
              </th>
              <SortableHeader
                label="Status"
                column="isActive"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
              <th className="h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Leads
              </th>
              <SortableHeader
                label="Updated"
                column="updatedAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="hidden md:table-cell"
              />
              <th className="h-9 w-10 px-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <ProjectTableRow
                key={project.id}
                project={project}
                highlightedProjectId={highlightedProjectId}
                onHighlightProject={onHighlightProject}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectTableRow({
  project,
  highlightedProjectId,
  onHighlightProject,
}: {
  project: Project;
  highlightedProjectId?: string | null;
  onHighlightProject?: (projectId: string) => void;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isHighlighted = highlightedProjectId === project.id;

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isHighlighted]);

  return (
    <tr
      ref={rowRef}
      className={cn(
        "border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30",
        isHighlighted && "bg-primary/5 ring-1 ring-inset ring-primary/20",
        !project.isActive && "opacity-70",
      )}
      onClick={() => onHighlightProject?.(project.id)}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <AppIcons.projects className="size-4" />
          </div>
          <span className="font-medium text-foreground">{project.name}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Link
          href={`/developers?developerId=${project.developer.id}&search=${encodeURIComponent(project.developer.name)}`}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={(event) => event.stopPropagation()}
        >
          {project.developer.name}
        </Link>
      </td>
      <td className="hidden max-w-[12rem] truncate px-3 py-2.5 text-xs text-muted-foreground lg:table-cell">
        {project.location ?? "—"}
      </td>
      <td className="px-3 py-2.5">
        <Badge variant={project.isActive ? "secondary" : "outline"}>
          {project.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-3 py-2.5">
        {(project.interestedLeadCount ?? 0) > 0 ? (
          <Link
            href={`/leads?projectId=${project.id}`}
            className="inline-flex"
            onClick={(event) => event.stopPropagation()}
          >
            <Badge variant="outline" className="tabular-nums">
              {formatNumber(project.interestedLeadCount ?? 0)}
            </Badge>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden px-3 py-2.5 text-xs text-muted-foreground md:table-cell">
        {formatRelativeTime(project.updatedAt)}
      </td>
      <td
        className="px-2 py-2.5 text-right"
        onClick={(event) => event.stopPropagation()}
      >
        <ProjectRowActions project={project} />
      </td>
    </tr>
  );
}
