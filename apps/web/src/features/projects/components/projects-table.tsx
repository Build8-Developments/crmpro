"use client";

import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { ProjectRowActions, ProjectRowContextMenu } from "@/features/projects/components/project-row-actions";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { Project, ProjectsSortField } from "@/features/projects/types";
import { formatNumber, formatRelativeTime, getInitials } from "@/lib/format";
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
        "h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase",
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
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <SortableHeader
              label="Project"
              column="name"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Developer
            </th>
            <SortableHeader
              label="Status"
              column="isActive"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
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
            <th className="h-8 w-10 px-2" aria-label="Actions" />
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
  const openDetail = useProjectUiStore((s) => s.openDetail);
  const isHighlighted = highlightedProjectId === project.id;
  const leadCount = project.interestedLeadCount ?? 0;

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isHighlighted]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          ref={rowRef}
          className={cn(
            "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20",
            isHighlighted && "bg-primary/5",
            !project.isActive && "opacity-70",
          )}
          onClick={() => {
            onHighlightProject?.(project.id);
            openDetail(project.id);
          }}
        >
          <td className="px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground">
                {getInitials(project.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {project.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {project.location?.trim() || "No location"}
                </p>
              </div>
            </div>
          </td>
          <td className="px-3 py-2.5">
            <Link
              href={`/developers?developerId=${project.developer.id}&search=${encodeURIComponent(project.developer.name)}`}
              className="text-xs font-medium text-foreground/80 transition-colors hover:text-foreground"
              onClick={(event) => event.stopPropagation()}
            >
              {project.developer.name}
            </Link>
          </td>
          <td className="px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  project.isActive ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
              />
              {project.isActive ? "Active" : "Inactive"}
            </span>
          </td>
          <td className="px-3 py-2.5">
            {leadCount > 0 ? (
              <Link
                href={`/leads?projectId=${project.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-foreground transition-colors hover:text-primary"
                onClick={(event) => event.stopPropagation()}
              >
                <AppIcons.leads className="size-3 text-muted-foreground" />
                {formatNumber(leadCount)}
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
      </ContextMenuTrigger>
      <ProjectRowContextMenu project={project} />
    </ContextMenu>
  );
}
