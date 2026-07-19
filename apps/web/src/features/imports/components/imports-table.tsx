"use client";

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

interface ImportsTableProps {
  jobs: ImportJob[];
  onSelectJob: (jobId: string) => void;
}

export function ImportsTable({ jobs, onSelectJob }: ImportsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              File
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Results
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Progress
            </th>
            <th className="h-8 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Started
            </th>
            <th className="h-8 w-10 px-2" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const progress = getImportProgressPercent(job);
            const active = isActiveImportStatus(job.status);

            return (
              <tr
                key={job.id}
                className="cursor-pointer border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/20"
                onClick={() => onSelectJob(job.id)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
                      <AppIcons.imports className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {job.fileAsset.originalFilename}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
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
                      getImportStatusTone(job.status),
                    )}
                  >
                    {active ? (
                      <AppIcons.loader className="mr-1 size-3 animate-spin" />
                    ) : null}
                    {formatImportStatus(job.status)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                  <span className="text-foreground">
                    {formatNumber(job.successfulRows)}
                  </span>{" "}
                  ok
                  {job.failedRows > 0 ? (
                    <>
                      {" · "}
                      <span className="text-destructive">
                        {formatNumber(job.failedRows)} failed
                      </span>
                    </>
                  ) : null}
                  {job.totalRows > 0 ? (
                    <span className="text-muted-foreground/80">
                      {" "}
                      / {formatNumber(job.totalRows)}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5">
                  {progress === null ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
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
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {formatRelativeTime(job.createdAt)}
                </td>
                <td className="px-2 py-2.5">
                  <AppIcons.chevronRight className="size-3.5 text-muted-foreground" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
