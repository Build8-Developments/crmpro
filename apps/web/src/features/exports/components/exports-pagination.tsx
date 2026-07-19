"use client";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/pagination";

interface ExportsPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function ExportsPagination({
  pagination,
  onPageChange,
}: ExportsPaginationProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
      <p className="text-xs text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages}
      </p>
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
