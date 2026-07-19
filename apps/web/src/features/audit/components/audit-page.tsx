"use client";

import { useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuditDetailDrawer } from "@/features/audit/components/audit-detail-drawer";
import { AuditEmptyState } from "@/features/audit/components/audit-empty-state";
import { AuditHeader } from "@/features/audit/components/audit-header";
import { AuditPagination } from "@/features/audit/components/audit-pagination";
import { AuditSkeleton } from "@/features/audit/components/audit-skeleton";
import { AuditTable } from "@/features/audit/components/audit-table";
import { AuditToolbar } from "@/features/audit/components/audit-toolbar";
import { useAuditLogs } from "@/features/audit/hooks";
import { useAuditUrlState } from "@/features/audit/hooks/use-audit-url-state";
import { useAuditUiStore } from "@/features/audit/stores/audit-ui-store";
import type { AuditActionFilter, AuditEntityTypeFilter } from "@/features/audit/types";
import { toIsoDateEnd, toIsoDateStart } from "@/features/audit/utils/audit-labels";
import { useUsers } from "@/features/users/hooks";

const AUDIT_PAGE_SIZE = 50;

export function AuditPage() {
  const [page, setPage] = useState(1);
  const [actorUserId, setActorUserId] = useState<string | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] =
    useState<AuditEntityTypeFilter>("all");
  const [actionFilter, setActionFilter] = useState<AuditActionFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const selectedLogId = useAuditUiStore((s) => s.selectedLogId);
  const openDrawer = useAuditUiStore((s) => s.openDrawer);

  useAuditUrlState({
    actorUserId,
    setActorUserId,
    entityTypeFilter,
    setEntityTypeFilter,
    actionFilter,
    setActionFilter,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedLogId,
    openDrawer,
  });

  const { data: usersData, isLoading: usersLoading } = useUsers({
    page: 1,
    limit: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const actorOptions = useMemo(
    () =>
      (usersData?.items ?? []).map((user) => ({
        id: user.id,
        label: user.fullName,
      })),
    [usersData?.items],
  );

  const { data, isLoading, isError, isFetching, refetch } = useAuditLogs({
    page,
    limit: AUDIT_PAGE_SIZE,
    actorUserId: actorUserId ?? undefined,
    entityType: entityTypeFilter === "all" ? undefined : entityTypeFilter,
    action: actionFilter === "all" ? undefined : actionFilter,
    from: fromDate ? toIsoDateStart(fromDate) : undefined,
    to: toDate ? toIsoDateEnd(toDate) : undefined,
  });

  const logs = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters =
    actorUserId !== null ||
    entityTypeFilter !== "all" ||
    actionFilter !== "all" ||
    fromDate.length > 0 ||
    toDate.length > 0;
  const isEmpty = logs.length === 0;

  const handleActorChange = (userId: string | null) => {
    setActorUserId(userId);
    setPage(1);
  };

  const handleEntityTypeChange = (filter: AuditEntityTypeFilter) => {
    setEntityTypeFilter(filter);
    setPage(1);
  };

  const handleActionChange = (filter: AuditActionFilter) => {
    setActionFilter(filter);
    setPage(1);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setActorUserId(null);
    setEntityTypeFilter("all");
    setActionFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  if (isLoading && !data) {
    return <AuditSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-6 px-6 py-6 md:px-8">
        <AuditHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load audit log
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch audit events. Check your connection and try
              again.
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
    <div className="space-y-6 px-6 py-6 md:px-8">
      <AuditHeader />

      <div className="space-y-3">
        <AuditToolbar
          actorUserId={actorUserId}
          onActorUserIdChange={handleActorChange}
          actorOptions={actorOptions}
          actorsLoading={usersLoading}
          entityTypeFilter={entityTypeFilter}
          onEntityTypeFilterChange={handleEntityTypeChange}
          actionFilter={actionFilter}
          onActionFilterChange={handleActionChange}
          fromDate={fromDate}
          onFromDateChange={handleFromDateChange}
          toDate={toDate}
          onToDateChange={handleToDateChange}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? logs.length}
          isFetching={isFetching}
        />

        {isEmpty ? (
          <AuditEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <AuditTable
              logs={logs}
              selectedLogId={selectedLogId}
              onSelectLog={openDrawer}
            />
            {pagination ? (
              <AuditPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <AuditDetailDrawer />
    </div>
  );
}
