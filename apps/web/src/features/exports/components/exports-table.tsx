"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExportJob } from "@/features/exports/types";
import {
  formatExportStatus,
  formatExportType,
  getExportStatusTone,
  isActiveExportStatus,
  summarizeExportFilters,
} from "@/features/exports/utils/export-formatters";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ExportsTableProps {
  jobs: ExportJob[];
  onSelectJob: (jobId: string) => void;
}

export function ExportsTable({ jobs, onSelectJob }: ExportsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Export
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Rows
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Progress
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Started
            </th>
            <th className="h-8 w-24 px-2" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const active = isActiveExportStatus(job.status);
            const progress = Math.min(100, Math.max(0, job.progress));

            return (
              <tr
                key={job.id}
                className="cursor-pointer border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/20"
                onClick={() => onSelectJob(job.id)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <AppIcons.exports className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {formatExportType(job.exportType)} · {job.format}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {summarizeExportFilters(job.filters)} ·{" "}
                        {job.createdBy.name}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 px-1.5 text-[10px] font-medium",
                      getExportStatusTone(job.status),
                    )}
                  >
                    {active ? (
                      <AppIcons.loader className="mr-1 size-3 animate-spin" />
                    ) : null}
                    {formatExportStatus(job.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                  {job.rowCount !== null ? formatNumber(job.rowCount) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex min-w-[7rem] items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
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
                    <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">
                      {progress}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {formatRelativeTime(job.createdAt)}
                </td>
                <td className="px-2 py-2.5">
                  {job.status === "COMPLETED" && job.download ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(
                          job.download!.downloadUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      <AppIcons.exports className="size-3.5" />
                      Download
                    </Button>
                  ) : (
                    <AppIcons.chevronRight className="mx-auto size-3.5 text-muted-foreground" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
