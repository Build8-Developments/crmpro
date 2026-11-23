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
import { CreateExportDialog } from "@/features/exports/components/create-export-dialog";
import { ExportJobDetailDrawer } from "@/features/exports/components/export-job-detail-drawer";
import { ExportsEmptyState } from "@/features/exports/components/exports-empty-state";
import { ExportsHeader } from "@/features/exports/components/exports-header";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ExportsSkeleton } from "@/features/exports/components/exports-skeleton";
import { ExportsTable } from "@/features/exports/components/exports-table";
import { ExportsToolbar } from "@/features/exports/components/exports-toolbar";
import { useExportJobs } from "@/features/exports/hooks";
import { useExportUiStore } from "@/features/exports/stores/export-ui-store";
import type { ExportJobStatus } from "@/features/exports/types";

const EXPORTS_PAGE_SIZE = 20;

export function ExportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ExportJobStatus | "all">(
    "all",
  );
  const openJobDetail = useExportUiStore((s) => s.openJobDetail);

  const { data, isLoading, isError, isFetching, refetch } = useExportJobs({
    page,
    limit: EXPORTS_PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const jobs = data?.items ?? [];
  const pagination = data?.pagination;

  if (isLoading && !data) {
    return <ExportsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <ExportsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load exports
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your export jobs. Try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <ExportsHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <ExportsToolbar
          totalItems={pagination?.totalItems ?? jobs.length}
          statusFilter={statusFilter}
          onStatusFilterChange={(status) => {
            setStatusFilter(status);
            setPage(1);
          }}
          isFetching={isFetching}
        />

        {jobs.length === 0 ? (
          <ExportsEmptyState />
        ) : (
          <>
            <ExportsTable jobs={jobs} onSelectJob={openJobDetail} />
            {pagination ? (
              <DataTablePagination
                pagination={pagination}
                onPageChange={setPage}
                itemLabel="exports"
                hideOnSinglePage
              />
            ) : null}
          </>
        )}
      </div>

      <CreateExportDialog />
      <ExportJobDetailDrawer />
    </div>
  );
}
