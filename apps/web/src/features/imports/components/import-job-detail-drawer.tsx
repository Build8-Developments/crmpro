"use client";

import { useState, type ReactNode } from "react";
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
import { getFileDownloadUrl } from "@/features/files/api";
import { useImportJob } from "@/features/imports/hooks";
import type { ImportJobErrorEntry } from "@/features/imports/types";
import { useImportUiStore } from "@/features/imports/stores/import-ui-store";
import {
  formatImportStatus,
  getImportProgressPercent,
  getImportStatusTone,
  isActiveImportStatus,
} from "@/features/imports/utils/import-formatters";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_LISTED_ENTRIES = 100;

function RowEntries({
  title,
  description,
  entries,
  tone,
}: {
  title: string;
  description?: string;
  entries: ImportJobErrorEntry[];
  tone: "error" | "duplicate";
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-foreground">
          {title}
          {entries.length >= MAX_LISTED_ENTRIES
            ? ` (showing first ${MAX_LISTED_ENTRIES})`
            : ""}
        </p>
        {description ? (
          <p className="text-[11px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-border/60 p-2">
        {entries.map((entry, index) => (
          <li
            key={`${entry.row}-${index}`}
            className={cn(
              "rounded-md px-2.5 py-2 text-xs",
              tone === "duplicate" ? "bg-amber-500/10" : "bg-muted/40",
            )}
          >
            <span className="font-medium text-foreground">
              {entry.row > 0 ? `Row ${entry.row}` : "File"}
            </span>
            <span className="text-muted-foreground"> — {entry.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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

export function ImportJobDetailDrawer() {
  const selectedJobId = useImportUiStore((s) => s.selectedJobId);
  const closeJobDetail = useImportUiStore((s) => s.closeJobDetail);
  const { data: job, isLoading, isError, refetch, isFetching } = useImportJob(
    selectedJobId ?? undefined,
  );
  const [downloading, setDownloading] = useState(false);

  const open = Boolean(selectedJobId);
  const progress = job ? getImportProgressPercent(job) : null;
  const active = job ? isActiveImportStatus(job.status) : false;
  const entries = job?.errorSummary ?? [];
  const errors = entries.filter((entry) => entry.kind !== "duplicate");
  const duplicates = entries.filter((entry) => entry.kind === "duplicate");

  const handleDownloadSource = async () => {
    if (!job) return;
    setDownloading(true);
    try {
      const result = await getFileDownloadUrl(job.fileAsset.id);
      window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && closeJobDetail()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle>Import details</SheetTitle>
          <SheetDescription>
            Status, row results, and validation errors
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
                Couldn&apos;t load this import job.
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
                      {job.fileAsset.originalFilename}
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
                      getImportStatusTone(job.status),
                    )}
                  >
                    {active ? (
                      <AppIcons.loader className="mr-1 size-3 animate-spin" />
                    ) : null}
                    {formatImportStatus(job.status)}
                  </Badge>
                </div>

                {progress !== null ? (
                  <div className="space-y-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          job.status === "FAILED"
                            ? "bg-destructive"
                            : job.status === "PARTIAL_SUCCESS"
                              ? "bg-amber-500"
                              : "bg-primary",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatNumber(job.processedRows)} of{" "}
                      {formatNumber(job.totalRows)} rows processed
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2.5 rounded-lg border border-border/60 px-3 py-3">
                <DetailRow
                  label="Successful"
                  value={formatNumber(job.successfulRows)}
                />
                <DetailRow
                  label="Failed"
                  value={
                    <span
                      className={
                        job.failedRows > 0 ? "text-destructive" : undefined
                      }
                    >
                      {formatNumber(job.failedRows)}
                    </span>
                  }
                />
                <DetailRow
                  label="Skipped (already exist)"
                  value={
                    <span
                      className={
                        job.skippedRows > 0
                          ? "text-amber-700 dark:text-amber-300"
                          : undefined
                      }
                    >
                      {formatNumber(job.skippedRows ?? 0)}
                    </span>
                  }
                />
                <DetailRow
                  label="Existing phones"
                  value={
                    job.duplicatePolicy === "CREATE"
                      ? "Imported anyway"
                      : "Skipped"
                  }
                />
                <DetailRow
                  label="Total rows"
                  value={formatNumber(job.totalRows)}
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={downloading}
                onClick={() => void handleDownloadSource()}
              >
                {downloading ? (
                  <>
                    <AppIcons.loader className="size-3.5 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <AppIcons.exports className="size-3.5" />
                    Download source file
                  </>
                )}
              </Button>

              {errors.length > 0 ? (
                <RowEntries
                  title="Row errors"
                  entries={errors}
                  tone="error"
                />
              ) : null}

              {duplicates.length > 0 ? (
                <RowEntries
                  title="Skipped duplicates"
                  description="These rows' phone numbers already belong to a lead."
                  entries={duplicates}
                  tone="duplicate"
                />
              ) : null}

              {entries.length === 0 && job.status === "COMPLETED" ? (
                <p className="text-xs text-muted-foreground">
                  All rows imported successfully.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
