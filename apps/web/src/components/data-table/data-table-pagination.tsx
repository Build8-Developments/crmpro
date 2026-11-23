"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/pagination";

interface DataTablePaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Plural noun in "Showing 1–25 of 80 leads". */
  itemLabel?: string;
  /** Render nothing when everything fits on one page. */
  hideOnSinglePage?: boolean;
  className?: string;
}

export function paginationRangeLabel(
  { page, limit, totalItems }: Pick<PaginationMeta, "page" | "limit" | "totalItems">,
  itemLabel = "results",
): string {
  if (totalItems === 0) return `Showing 0 ${itemLabel}`;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);
  return `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(totalItems)} ${itemLabel}`;
}

/** Prev / page / next footer under a server-paginated table. */
export function DataTablePagination({
  pagination,
  onPageChange,
  itemLabel,
  hideOnSinglePage = false,
  className,
}: DataTablePaginationProps) {
  const { page, totalPages, hasNextPage, hasPreviousPage } = pagination;

  if (hideOnSinglePage && totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-t border-border/50 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {paginationRangeLabel(pagination, itemLabel)}
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs sm:h-7 sm:px-2"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
        >
          <AppIcons.arrowLeft className="size-3.5" />
          Prev
        </Button>
        <span className="min-w-[3.5rem] px-1 text-center text-xs tabular-nums text-muted-foreground">
          {page}/{Math.max(totalPages, 1)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 text-xs sm:h-7 sm:px-2"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <AppIcons.arrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
