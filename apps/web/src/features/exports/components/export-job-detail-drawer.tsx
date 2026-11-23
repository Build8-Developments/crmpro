"use client";

import type { ReactNode } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useExportJob } from "@/features/exports/hooks";
import { useExportUiStore } from "@/features/exports/stores/export-ui-store";
import {
  formatExportFormat,
  formatExportStatus,
  formatExportType,
  getExportStatusTone,
  isActiveExportStatus,
  summarizeExportFilters,
} from "@/features/exports/utils/export-formatters";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ExportJobDetailDrawer() {
  const selectedJobId = useExportUiStore((s) => s.selectedJobId);
  const closeJobDetail = useExportUiStore((s) => s.closeJobDetail);
  const { data: job, isLoading, isError, refetch, isFetching } = useExportJob(
    selectedJobId ?? undefined,
  );

  const open = Boolean(selectedJobId);
  const active = job ? isActiveExportStatus(job.status) : false;
  const progress = job ? Math.min(100, Math.max(0, job.progress)) : 0;

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeJobDetail()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle>Export details</SheetTitle>
          <SheetDescription>
            Status, filters, and download when ready
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && !job ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}

          {isError ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t load this export job.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {job ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {formatExportType(job.exportType)} ·{" "}
                      {formatExportFormat(job.format)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {job.createdBy.name} ·{" "}
                      {formatRelativeTime(job.createdAt)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px]",
                      getExportStatusTone(job.status),
                    )}
                  >
                    {active ? (
                      <AppIcons.loader className="mr-1 size-3 animate-spin" />
                    ) : null}
                    {formatExportStatus(job.status)}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        job.status === "FAILED"
                          ? "bg-destructive"
                          : "bg-primary",
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {progress}% complete
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg border border-border/60 px-3 py-3">
                <DetailRow
                  label="Rows"
                  value={
                    job.rowCount !== null ? formatNumber(job.rowCount) : "—"
                  }
                />
                <DetailRow
                  label="Filters"
                  value={summarizeExportFilters(job.filters)}
                />
                <DetailRow
                  label="File"
                  value={job.fileAsset?.originalFilename ?? "—"}
                />
                <DetailRow
                  label="Completed"
                  value={
                    job.completedAt
                      ? formatRelativeTime(job.completedAt)
                      : active
                        ? "In progress"
                        : "—"
                  }
                />
              </div>

              {job.errorMessage ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {job.errorMessage}
                </p>
              ) : null}

              {job.status === "COMPLETED" && job.download ? (
                <Button
                  type="button"
                  className="w-full"
                  onClick={() =>
                    window.open(
                      job.download!.downloadUrl,
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  <AppIcons.exports className="size-3.5" />
                  Download CSV
                </Button>
              ) : null}

              {active ? (
                <p className="text-xs text-muted-foreground">
                  This page refreshes automatically while the export runs.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
