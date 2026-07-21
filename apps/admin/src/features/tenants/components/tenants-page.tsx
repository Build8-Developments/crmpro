"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TenantsEmptyState } from "@/features/tenants/components/tenants-empty-state";
import { TenantsHeader } from "@/features/tenants/components/tenants-header";
import { TenantsPagination } from "@/features/tenants/components/tenants-pagination";
import { TenantsSkeleton } from "@/features/tenants/components/tenants-skeleton";
import { TenantsTable } from "@/features/tenants/components/tenants-table";
import { TenantsToolbar } from "@/features/tenants/components/tenants-toolbar";
import { useTenants, useTenantsUrlState } from "@/features/tenants/hooks";
import type { TenantStatusFilter } from "@/features/tenants/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const TENANTS_PAGE_SIZE = 50;

export function TenantsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("all");
  const debouncedSearch = useDebouncedValue(search, 400);

  useTenantsUrlState({
    debouncedSearch,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
  });

  const { data, isLoading, isError, isFetching, refetch } = useTenants({
    page,
    limit: TENANTS_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const tenants = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 || statusFilter !== "all";
  const isEmpty = tenants.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: TenantStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  if (isLoading && !data) {
    return <TenantsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <TenantsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load tenants
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch tenants. Check your connection and try
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

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <TenantsHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <TenantsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? tenants.length}
          isFetching={isFetching}
        />

        {isEmpty ? (
          <TenantsEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <TenantsTable tenants={tenants} />
            {pagination ? (
              <TenantsPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
