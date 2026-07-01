"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { DeveloperRowActions } from "@/features/developers/components/developer-row-actions";
import type { Developer, DevelopersSortField } from "@/features/developers/types";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DevelopersTableProps {
  developers: Developer[];
  sortBy: DevelopersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: DevelopersSortField, sortOrder: "asc" | "desc") => void;
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
  onSortChange: (sortBy: DevelopersSortField, sortOrder: "asc" | "desc") => void;
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

export function DevelopersTable({
  developers,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedDeveloperId,
  onHighlightDeveloper,
}: DevelopersTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="border-b border-border/70 bg-muted/50">
            <tr className="text-left">
              <SortableHeader
                label="Developer"
                column="name"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
              <th className="h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Projects
              </th>
              <th className="h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Leads
              </th>
              <SortableHeader
                label="Updated"
                column="updatedAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
              <SortableHeader
                label="Created"
                column="createdAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="hidden md:table-cell"
              />
              <th className="h-9 w-10 px-2" aria-label="Actions" />
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
      )}
      onClick={() => onHighlightDeveloper?.(developer.id)}
    >
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <AppIcons.building className="size-4" />
          </div>
          <span className="font-medium text-foreground">{developer.name}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        {developer.projectCount > 0 ? (
          <Link
            href={`/projects?developerId=${developer.id}`}
            className="inline-flex"
            onClick={(event) => event.stopPropagation()}
          >
            <Badge variant="secondary" className="tabular-nums">
              {formatNumber(developer.projectCount)}
            </Badge>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {(developer.interestedLeadCount ?? 0) > 0 ? (
          <Link
            href="/leads"
            className="inline-flex"
            onClick={(event) => event.stopPropagation()}
          >
            <Badge variant="outline" className="tabular-nums">
              {formatNumber(developer.interestedLeadCount ?? 0)}
            </Badge>
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">
        {formatRelativeTime(developer.updatedAt)}
      </td>
      <td className="hidden px-3 py-2.5 text-xs text-muted-foreground md:table-cell">
        {formatRelativeTime(developer.createdAt)}
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
