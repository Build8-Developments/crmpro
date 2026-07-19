"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { DeveloperRowActions } from "@/features/developers/components/developer-row-actions";
import type { Developer, DevelopersSortField } from "@/features/developers/types";
import { formatNumber, formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DevelopersTableProps {
  developers: Developer[];
  sortBy: DevelopersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (
    sortBy: DevelopersSortField,
    sortOrder: "asc" | "desc",
  ) => void;
  highlightedDeveloperId?: string | null;
  onHighlightDeveloper?: (developerId: string) => void;
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
  column: DevelopersSortField;
  sortBy: DevelopersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (
    sortBy: DevelopersSortField,
    sortOrder: "asc" | "desc",
  ) => void;
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

export function DevelopersTable({
  developers,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedDeveloperId,
  onHighlightDeveloper,
}: DevelopersTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <SortableHeader
              label="Developer"
              column="name"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Projects
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Leads
            </th>
            <SortableHeader
              label="Updated"
              column="updatedAt"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
              className="hidden sm:table-cell"
            />
            <th className="h-8 w-10 px-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {developers.map((developer) => (
            <DeveloperTableRow
              key={developer.id}
              developer={developer}
              highlightedDeveloperId={highlightedDeveloperId}
              onHighlightDeveloper={onHighlightDeveloper}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeveloperTableRow({
  developer,
  highlightedDeveloperId,
  onHighlightDeveloper,
}: {
  developer: Developer;
  highlightedDeveloperId?: string | null;
  onHighlightDeveloper?: (developerId: string) => void;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isHighlighted = highlightedDeveloperId === developer.id;
  const projectCount = developer.projectCount ?? 0;
  const leadCount = developer.interestedLeadCount ?? 0;

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isHighlighted]);

  return (
    <tr
      ref={rowRef}
      className={cn(
        "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20",
        isHighlighted && "bg-primary/5",
      )}
      onClick={() => onHighlightDeveloper?.(developer.id)}
    >
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tracking-wide text-muted-foreground">
            {getInitials(developer.name)}
          </span>
          <span className="truncate text-sm font-medium text-foreground">
            {developer.name}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        {projectCount > 0 ? (
          <Link
            href={`/projects?developerId=${developer.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-foreground transition-colors hover:text-primary"
            onClick={(event) => event.stopPropagation()}
          >
            <AppIcons.projects className="size-3 text-muted-foreground" />
            {formatNumber(projectCount)}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {leadCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-foreground">
            <AppIcons.leads className="size-3 text-muted-foreground" />
            {formatNumber(leadCount)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="hidden px-3 py-2.5 text-xs text-muted-foreground sm:table-cell">
        {formatRelativeTime(developer.updatedAt)}
      </td>
      <td
        className="px-2 py-2.5 text-right"
        onClick={(event) => event.stopPropagation()}
      >
        <DeveloperRowActions developer={developer} />
      </td>
    </tr>
  );
}
