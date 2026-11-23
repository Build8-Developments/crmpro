"use client";

import { Fragment, useEffect, useRef, type ReactElement, type ReactNode } from "react";
import {
  flexRender,
  type ColumnMeta,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { TableDensity } from "@/hooks/use-table-preferences";
import { cn } from "@/lib/utils";

type SortOrder = "asc" | "desc";
type Meta = ColumnMeta<unknown, unknown> | undefined;

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

// Static strings so Tailwind sees every class.
const HIDE_BELOW = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

export interface DataTableProps<TData, TSort extends string = string> {
  table: TanstackTable<TData>;
  /**
   * "fixed": column widths come from each column's `size` and long text
   * truncates (leads). "auto": the browser sizes columns to their content.
   */
  layout?: "fixed" | "auto";
  /** Minimum table width before it scrolls sideways. Fixed layout defaults to the column sizes. */
  minWidth?: number;
  density?: TableDensity;
  /** Current server-side sort; headers with `meta.sortable` become buttons. */
  sortBy?: TSort;
  sortOrder?: SortOrder;
  onSortChange?: (sortBy: TSort, sortOrder: SortOrder) => void;
  /** Whole-row click (rows become focusable; Enter also triggers it). */
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string | false | null | undefined;
  /** Row id to tint and scroll into view (e.g. the one opened from a link). */
  highlightedRowId?: string | null;
  /** Wrap each `<tr>`, e.g. in a right-click `ContextMenu` with the row as trigger. */
  renderRow?: (row: Row<TData>, rowElement: ReactElement) => ReactNode;
  /** Below `md` the table is replaced by these cards (CSS breakpoint, no flicker). */
  renderCard?: (row: Row<TData>) => ReactNode;
  /** Shown instead of the table when there are no rows (and not loading). */
  emptyState?: ReactNode;
  /** Show skeleton rows while there's no data yet. */
  isLoading?: boolean;
  loadingRowCount?: number;
  /**
   * Height cap of the scroll area (the header sticks while rows scroll).
   * Defaults to the viewport minus page chrome from `md` up; phones scroll the page.
   */
  scrollClassName?: string;
  className?: string;
  "aria-label"?: string;
}

export function DataTable<TData, TSort extends string = string>({
  table,
  layout = "auto",
  minWidth,
  density = "comfortable",
  sortBy,
  sortOrder = "desc",
  onSortChange,
  onRowClick,
  rowClassName,
  highlightedRowId,
  renderRow,
  renderCard,
  emptyState,
  isLoading = false,
  loadingRowCount = 8,
  scrollClassName = "md:max-h-[calc(100vh-16rem)]",
  className,
  "aria-label": ariaLabel,
}: DataTableProps<TData, TSort>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const columns = table.getVisibleLeafColumns();
  const fixed = layout === "fixed";
  const showSkeleton = isLoading && rows.length === 0;

  const highlightedRowPresent =
    highlightedRowId != null && rows.some((row) => row.id === highlightedRowId);

  useEffect(() => {
    if (!highlightedRowPresent || !containerRef.current) return;
    // Table rows and cards both carry the id; scroll whichever is on screen.
    const target = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>("[data-row-id]"),
    ).find((node) => node.dataset.rowId === highlightedRowId && node.offsetParent !== null);
    target?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedRowId, highlightedRowPresent]);

  if (!isLoading && rows.length === 0 && emptyState !== undefined) {
    return <>{emptyState}</>;
  }

  const cellPadding = density === "compact" ? "py-1.5" : "py-2.5";

  const renderTableRow = (row: Row<TData>) => {
    const selected = row.getIsSelected();
    const highlighted = row.id === highlightedRowId;
    const tr = (
      <tr
        data-row-id={row.id}
        data-state={selected ? "selected" : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
        onKeyDown={
          onRowClick
            ? (event) => {
                if (event.key === "Enter" && event.target === event.currentTarget) {
                  onRowClick(row.original);
                }
              }
            : undefined
        }
        className={cn(
          "group/row border-b border-border/50 transition-colors duration-fast ease-enter last:border-b-0",
          "hover:bg-accent/60",
          onRowClick && "cursor-pointer outline-none focus-visible:bg-accent/60",
          highlighted && "bg-primary/5",
          selected && "bg-primary/[0.06] hover:bg-primary/10",
          rowClassName?.(row.original),
        )}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as Meta;
          return (
            <td
              key={cell.id}
              className={cn(
                "px-3 align-middle",
                cellPadding,
                fixed && "overflow-hidden",
                ALIGN[meta?.align ?? "left"],
                meta?.hideBelow && HIDE_BELOW[meta.hideBelow],
                meta?.cellClassName,
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          );
        })}
      </tr>
    );
    return <Fragment key={row.id}>{renderRow ? renderRow(row, tr) : tr}</Fragment>;
  };

  return (
    <div ref={containerRef} className={cn("min-h-0 flex-1 overflow-hidden bg-background", className)}>
      {renderCard ? (
        <ul className="divide-y divide-border/50 md:hidden" aria-label={ariaLabel}>
          {showSkeleton
            ? Array.from({ length: Math.min(loadingRowCount, 4) }).map((_, index) => (
                <li key={index} className="space-y-2.5 px-4 py-3.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-11 w-full" />
                </li>
              ))
            : rows.map((row) => (
                <li
                  key={row.id}
                  data-row-id={row.id}
                  className={cn(row.id === highlightedRowId && "bg-primary/5")}
                >
                  {renderCard(row)}
                </li>
              ))}
        </ul>
      ) : null}

      <div
        className={cn("overflow-auto", scrollClassName, renderCard && "hidden md:block")}
      >
        <table
          aria-label={ariaLabel}
          className={cn("w-full border-collapse text-xs", fixed && "table-fixed")}
          style={{ minWidth: minWidth ?? (fixed ? table.getTotalSize() : undefined) }}
        >
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border/70">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as Meta;
                  const columnId = header.column.id;
                  const sortable = Boolean(meta?.sortable && onSortChange);
                  const sorted = sortable && sortBy === columnId;
                  const content = header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext());

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted ? (sortOrder === "asc" ? "ascending" : "descending") : undefined
                      }
                      style={fixed ? { width: header.getSize() } : undefined}
                      className={cn(
                        "h-9 px-3 text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase",
                        ALIGN[meta?.align ?? "left"],
                        meta?.hideBelow && HIDE_BELOW[meta.hideBelow],
                        meta?.headerClassName,
                      )}
                    >
                      {sortable && content !== null ? (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-0.5 uppercase transition-colors hover:text-foreground",
                            sorted && "text-foreground",
                          )}
                          onClick={() =>
                            onSortChange?.(
                              columnId as TSort,
                              sorted && sortOrder === "desc" ? "asc" : "desc",
                            )
                          }
                        >
                          {content}
                          {sorted ? (
                            <AppIcons.chevronDown
                              className={cn("size-3", sortOrder === "asc" && "rotate-180")}
                            />
                          ) : null}
                        </button>
                      ) : (
                        content
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: loadingRowCount }).map((_, index) => (
                  <tr key={index} className="border-b border-border/50 last:border-b-0">
                    {columns.map((column) => {
                      const meta = column.columnDef.meta as Meta;
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            "px-3",
                            cellPadding,
                            meta?.hideBelow && HIDE_BELOW[meta.hideBelow],
                          )}
                        >
                          <Skeleton className="h-4 w-full max-w-32" />
                        </td>
                      );
                    })}
                  </tr>
                ))
              : rows.map(renderTableRow)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
