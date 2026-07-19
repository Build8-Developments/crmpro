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
import { CreateImportDialog } from "@/features/imports/components/create-import-dialog";
import { ImportJobDetailDrawer } from "@/features/imports/components/import-job-detail-drawer";
import { ImportsEmptyState } from "@/features/imports/components/imports-empty-state";
import { ImportsHeader } from "@/features/imports/components/imports-header";
import { ImportsPagination } from "@/features/imports/components/imports-pagination";
import { ImportsSkeleton } from "@/features/imports/components/imports-skeleton";
import { ImportsTable } from "@/features/imports/components/imports-table";
import { ImportsToolbar } from "@/features/imports/components/imports-toolbar";
import { useImportJobs } from "@/features/imports/hooks";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";

const IMPORTS_PAGE_SIZE = 20;

export function ImportsPage() {
  const [page, setPage] = useState(1);
  const openJobDetail = useImportUiStore((s) => s.openJobDetail);

  const { data, isLoading, isError, isFetching, refetch } = useImportJobs({
    page,
    limit: IMPORTS_PAGE_SIZE,
  });

  const jobs = data?.items ?? [];
  const pagination = data?.pagination;

  if (isLoading && !data) {
    return <ImportsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <ImportsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load imports
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your import jobs. Try again.
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
      <ImportsHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <ImportsToolbar
          totalItems={pagination?.totalItems ?? jobs.length}
          isFetching={isFetching}
        />

        {jobs.length === 0 ? (
          <ImportsEmptyState />
        ) : (
          <>
            <ImportsTable jobs={jobs} onSelectJob={openJobDetail} />
            {pagination ? (
              <ImportsPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <CreateImportDialog />
      <ImportJobDetailDrawer />
    </div>
  );
}
