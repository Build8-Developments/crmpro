"use client";

import { Suspense, useCallback, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanArchiveDialog } from "@/features/plans/components/plan-archive-dialog";
import { PlanFormDialog } from "@/features/plans/components/plan-form-dialog";
import { PlansEmptyState } from "@/features/plans/components/plans-empty-state";
import { PlansHeader } from "@/features/plans/components/plans-header";
import { PlansPagination } from "@/features/plans/components/plans-pagination";
import { PlansSkeleton } from "@/features/plans/components/plans-skeleton";
import { PlansTable } from "@/features/plans/components/plans-table";
import { PlansToolbar } from "@/features/plans/components/plans-toolbar";
import { usePlans } from "@/features/plans/hooks";
import { usePlansUrlState } from "@/features/plans/hooks/use-plans-url-state";
import type { PlanListItem, PlanStatusFilter } from "@/features/plans/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOpenCreateFromQuery } from "@/hooks/use-open-create-from-query";

const PLANS_PAGE_SIZE = 50;

export function PlansPage() {
  return (
    <Suspense fallback={<PlansSkeleton />}>
      <PlansPageContent />
    </Suspense>
  );
}

function PlansPageContent() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PlanStatusFilter>("all");
  const [currency, setCurrency] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanListItem | null>(null);
  const [archivePlan, setArchivePlan] = useState<PlanListItem | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  usePlansUrlState({
    debouncedSearch,
    setSearch,
    statusFilter,
    setStatusFilter,
    currency,
    setCurrency,
    page,
    setPage,
  });

  const { data, isLoading, isError, isFetching, refetch } = usePlans({
    page,
    limit: PLANS_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    currency: currency ?? undefined,
    isActive:
      statusFilter === "all"
        ? undefined
        : statusFilter === "active"
          ? true
          : false,
  });

  const plans = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 ||
    currency !== null ||
    statusFilter !== "all";
  const isEmpty = plans.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: PlanStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleCurrencyChange = (value: string | null) => {
    setCurrency(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setCurrency(null);
    setStatusFilter("all");
    setPage(1);
  };

  const handleCreate = useCallback(() => {
    setEditingPlan(null);
    setFormOpen(true);
  }, []);

  useOpenCreateFromQuery(handleCreate);

  const handleEdit = (plan: PlanListItem) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingPlan(null);
  };

  if (isLoading && !data) {
    return <PlansSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <PlansHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load plans
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch subscription plans. Check your connection
              and try again.
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
      <PlansHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <PlansToolbar
          search={search}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? plans.length}
          isFetching={isFetching}
          onCreate={handleCreate}
        />

        {isEmpty ? (
          <PlansEmptyState hasFilters={hasFilters} onCreate={handleCreate} />
        ) : (
          <>
            <PlansTable
              plans={plans}
              onEdit={handleEdit}
              onArchive={setArchivePlan}
            />
            {pagination ? (
              <PlansPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <PlanFormDialog
        open={formOpen}
        plan={editingPlan}
        onClose={handleCloseForm}
      />
      <PlanArchiveDialog
        plan={archivePlan}
        open={Boolean(archivePlan)}
        onClose={() => setArchivePlan(null)}
      />
    </div>
  );
}
