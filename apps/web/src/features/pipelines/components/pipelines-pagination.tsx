"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/types/pagination";

interface PipelinesPaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function PipelinesPagination({
  pagination,
  onPageChange,
}: PipelinesPaginationProps) {
  if (pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNextPage, hasPreviousPage } = pagination;

  return (
    <div className="flex items-center justify-between gap-1 border-t border-border/60 p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 flex-1 px-2 text-xs"
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(page - 1)}
      >
        <AppIcons.arrowLeft className="size-3.5" />
      </Button>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {page}/{totalPages}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 flex-1 px-2 text-xs"
        disabled={!hasNextPage}
        onClick={() => onPageChange(page + 1)}
      >
        <AppIcons.arrowRight className="size-3.5" />
      </Button>
    </div>
  );
}
