"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import type { PlatformFailedImportItem } from "@/features/dashboard/types";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { cn } from "@/lib/utils";

export function ImportsPage() {
  const { can } = usePermissions();
  const canRead = can(ADMIN_PERMISSIONS.PLATFORM_ANALYTICS_READ);

  const { data, isLoading, isError, refetch, isFetching } = useDashboardSummary({
    enabled: canRead,
  });

  if (!canRead) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Header />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AppIcons.lock className="size-4" />
              Access locked
            </CardTitle>
            <CardDescription>
              Platform analytics permission is required to inspect import jobs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Header />
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Header />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load imports</CardTitle>
            <CardDescription>
              Could not fetch platform analytics for import jobs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobs = data.attention.failedImports;
  const failedCount =
    data.importActivity.byStatus.FAILED +
    data.importActivity.byStatus.PARTIAL_SUCCESS;

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Header />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            {formatNumber(failedCount)} failed / partial (all time status)
          </Badge>
          <Badge variant="secondary" className="h-6 px-2 text-[11px]">
            {formatNumber(data.importActivity.last7d)} jobs in 7d
          </Badge>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No failed or partial imports in the last 7 days.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          {jobs.map((job) => (
            <FailedImportRow key={job.id} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Failed imports
      </h1>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Recent FAILED / PARTIAL_SUCCESS jobs across tenants (last 7 days)
      </p>
    </div>
  );
}

function FailedImportRow({ job }: { job: PlatformFailedImportItem }) {
  const isFailed = job.status === "FAILED";

  return (
    <li>
      <Link
        href={`/tenants/${job.tenant.id}`}
        className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {job.tenant.name}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 text-[10px]",
                isFailed
                  ? "border-destructive/30 text-destructive"
                  : "border-amber-500/30 text-amber-700 dark:text-amber-400",
              )}
            >
              {job.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {job.tenant.slug}
            <span className="mx-1">·</span>
            {formatNumber(job.failedRows)} of {formatNumber(job.totalRows)} rows
            failed
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatRelativeTime(job.createdAt)}</span>
          <AppIcons.chevronRight className="size-4 text-muted-foreground/50" />
        </div>
      </Link>
    </li>
  );
}
