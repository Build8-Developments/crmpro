"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import type { ImportJob } from "@/features/imports/types";
import {
  formatImportStatus,
  getImportProgressPercent,
  getImportStatusTone,
  isActiveImportStatus,
} from "@/features/imports/utils/import-formatters";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const importColumns: ColumnDef<ImportJob>[] = [
  {
    id: "file",
    header: "File",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <AppIcons.imports className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.original.fileAsset.originalFilename}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{row.original.createdBy.name}</p>
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn("h-5 px-1.5 text-[10px] font-medium", getImportStatusTone(row.original.status))}
      >
        {isActiveImportStatus(row.original.status) ? (
          <AppIcons.loader className="mr-1 size-3 animate-spin" />
        ) : null}
        {formatImportStatus(row.original.status)}
      </Badge>
    ),
  },
  {
    id: "results",
    header: "Results",
    cell: ({ row }) => <ImportResultsCell job={row.original} />,
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => <ImportProgressCell job={row.original} />,
  },
  {
    id: "createdAt",
    header: "Started",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.createdAt)}</span>
    ),
  },
  {
    id: "open",
    header: () => <span className="sr-only">Open</span>,
    cell: () => <AppIcons.chevronRight className="size-3.5 text-muted-foreground" />,
    meta: { headerClassName: "w-10 px-2", cellClassName: "px-2" },
  },
];

function ImportResultsCell({ job }: { job: ImportJob }) {
  return (
    <span className="tabular-nums text-muted-foreground">
      <span className="text-foreground">{formatNumber(job.successfulRows)}</span> ok
      {job.failedRows > 0 ? (
        <>
          {" · "}
          <span className="text-destructive">{formatNumber(job.failedRows)} failed</span>
        </>
      ) : null}
      {job.skippedRows > 0 ? (
        <>
          {" · "}
          <span className="text-amber-700 dark:text-amber-300">
            {formatNumber(job.skippedRows)} skipped
          </span>
        </>
      ) : null}
      {job.totalRows > 0 ? (
        <span className="text-muted-foreground/80"> / {formatNumber(job.totalRows)}</span>
      ) : null}
    </span>
  );
}

function ImportProgressCell({ job }: { job: ImportJob }) {
  const progress = getImportProgressPercent(job);
  if (progress === null) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
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
      <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
        {progress}%
      </span>
    </div>
  );
}
