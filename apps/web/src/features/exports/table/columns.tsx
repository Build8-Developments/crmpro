"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExportJob } from "@/features/exports/types";
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

export const exportColumns: ColumnDef<ExportJob>[] = [
  {
    id: "export",
    header: "Export",
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <AppIcons.exports className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {formatExportType(row.original.exportType)} · {formatExportFormat(row.original.format)}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {summarizeExportFilters(row.original.filters)} · {row.original.createdBy.name}
          </p>
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
        className={cn("h-5 px-1.5 text-[10px] font-medium", getExportStatusTone(row.original.status))}
      >
        {isActiveExportStatus(row.original.status) ? (
          <AppIcons.loader className="mr-1 size-3 animate-spin" />
        ) : null}
        {formatExportStatus(row.original.status)}
      </Badge>
    ),
  },
  {
    id: "rows",
    header: "Rows",
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.rowCount !== null ? formatNumber(row.original.rowCount) : "—"}
      </span>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = Math.min(100, Math.max(0, row.original.progress));
      return (
        <div className="flex min-w-[7rem] items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                row.original.status === "FAILED" ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
            {progress}%
          </span>
        </div>
      );
    },
  },
  {
    id: "createdAt",
    header: "Started",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.createdAt)}</span>
    ),
  },
  {
    id: "download",
    header: () => <span className="sr-only">Download</span>,
    cell: ({ row }) => {
      const download = row.original.status === "COMPLETED" ? row.original.download : null;
      if (!download) {
        return <AppIcons.chevronRight className="mx-auto size-3.5 text-muted-foreground" />;
      }
      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            window.open(download.downloadUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <AppIcons.exports className="size-3.5" />
          Download
        </Button>
      );
    },
    meta: { headerClassName: "w-24 px-2", cellClassName: "px-2" },
  },
];
