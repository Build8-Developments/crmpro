"use client";

import { useMemo } from "react";
import type {
  OnChangeFn,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import type { Lead } from "@/features/leads/types";
import type { LeadsSortField } from "@/features/leads/stores/leads-table-store";
import { createLeadColumns } from "./columns";

interface UseLeadsTableOptions {
  data: Lead[];
  pageCount: number;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  sortBy: LeadsSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: LeadsSortField, sortOrder: "asc" | "desc") => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
}

export function useLeadsTable({
  data,
  pageCount,
  rowSelection,
  onRowSelectionChange,
  sortBy,
  sortOrder,
  onSortChange,
  columnVisibility,
  onColumnVisibilityChange,
}: UseLeadsTableOptions) {
  const columns = useMemo(() => createLeadColumns(), []);

  const sorting: SortingState = useMemo(
    () => [{ id: sortBy, desc: sortOrder === "desc" }],
    [sortBy, sortOrder],
  );

  return useDataTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      pagination: { pageIndex: 0, pageSize: data.length || 1 },
    },
    onColumnVisibilityChange,
    enableRowSelection: true,
    onRowSelectionChange,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      if (!first) return;
      onSortChange(first.id as LeadsSortField, first.desc ? "desc" : "asc");
    },
  });
}
