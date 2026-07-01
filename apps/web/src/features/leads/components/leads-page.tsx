"use client";

import { useCallback, useEffect, useState } from "react";
import type { OnChangeFn, RowSelectionState } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLeads, useLeadsListParams } from "@/features/leads/hooks";
import {
  getSelectedLeadIds,
  useLeadsTableStore,
} from "@/features/leads/stores/leads-table-store";
import { BulkActionsToolbar } from "./bulk-actions-toolbar";
import { LeadsEmptyState } from "./leads-empty-state";
import { LeadsHeader } from "./leads-header";
import { LeadsPagination } from "./leads-pagination";
import { LeadsSkeleton } from "./leads-skeleton";
import { LeadsTable } from "./leads-table";
import { LeadsToolbar } from "./leads-toolbar";
import { useLeadsTable } from "@/features/leads/table/use-leads-table";
import { countActiveLeadFilters } from "@/features/leads/utils/lead-filters";

export function LeadsPage() {
  const [search, setSearch] = useState("");
  const listParams = useLeadsListParams(search);

  const sortBy = useLeadsTableStore((s) => s.sortBy);
  const sortOrder = useLeadsTableStore((s) => s.sortOrder);
  const filters = useLeadsTableStore((s) => s.filters);
  const rowSelection = useLeadsTableStore((s) => s.rowSelection);
  const setPage = useLeadsTableStore((s) => s.setPage);
  const limit = useLeadsTableStore((s) => s.limit);
  const setLimit = useLeadsTableStore((s) => s.setLimit);
  const setSort = useLeadsTableStore((s) => s.setSort);
  const setFilters = useLeadsTableStore((s) => s.setFilters);
  const clearFilters = useLeadsTableStore((s) => s.clearFilters);
  const setRowSelection = useLeadsTableStore((s) => s.setRowSelection);
  const clearRowSelection = useLeadsTableStore((s) => s.clearRowSelection);
  const resetPage = useLeadsTableStore((s) => s.resetPage);

  const { data, isLoading, isError, isFetching, refetch } = useLeads(listParams);

  useEffect(() => {
    resetPage();
  }, [listParams.search, resetPage]);

  const handleRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
    (updater) => {
      setRowSelection(
        typeof updater === "function" ? updater(rowSelection) : updater,
      );
    },
    [rowSelection, setRowSelection],
  );

  const leads = data?.items ?? [];
  const pagination = data?.pagination;
  const selectedCount = getSelectedLeadIds(rowSelection).length;
  const hasFilters =
    countActiveLeadFilters(filters) > 0 || search.trim().length > 0;

  const table = useLeadsTable({
    data: leads,
    pageCount: pagination?.totalPages ?? 0,
    rowSelection,
    onRowSelectionChange: handleRowSelectionChange,
    sortBy,
    sortOrder,
    onSortChange: setSort,
  });

  if (isLoading && !data) {
    return <LeadsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <LeadsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load leads
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your leads. Check your connection and try
              again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showEmpty =
    leads.length === 0 && !hasFilters && pagination?.totalItems === 0;

  return (
    <div className="flex min-h-0 flex-col gap-2 px-6 py-4 md:px-8">
      <LeadsHeader />

      <LeadsToolbar
        search={search}
        onSearchChange={setSearch}
        totalItems={pagination?.totalItems ?? 0}
        pageSize={limit}
        onPageSizeChange={setLimit}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => {
          clearFilters();
          setSearch("");
        }}
        isFetching={isFetching}
      />

      {showEmpty ? (
        <LeadsEmptyState />
      ) : (
        <>
          {leads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/15 px-6 py-12 text-center text-sm text-muted-foreground">
              No leads match your search or filters.
            </div>
          ) : (
            <LeadsTable
              table={table}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={setSort}
            />
          )}

          {pagination ? (
            <LeadsPagination
              pagination={pagination}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}

      <BulkActionsToolbar
        selectedCount={selectedCount}
        onClearSelection={clearRowSelection}
      />
    </div>
  );
}
