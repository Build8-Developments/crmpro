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
import { AuditDetailSheet } from "@/features/audit/components/audit-detail-sheet";
import { AuditEmptyState } from "@/features/audit/components/audit-empty-state";
import { AuditHeader } from "@/features/audit/components/audit-header";
import { AuditPagination } from "@/features/audit/components/audit-pagination";
import { AuditSkeleton } from "@/features/audit/components/audit-skeleton";
import {
  AuditTable,
  SecurityEventsTable,
} from "@/features/audit/components/audit-table";
import { AuditToolbar } from "@/features/audit/components/audit-toolbar";
import { useAuditLogs, useSecurityEvents } from "@/features/audit/hooks";
import { useAuditUrlState } from "@/features/audit/hooks/use-audit-url-state";
import type {
  AdminSecurityEventType,
  AuditTab,
  SecuritySeverity,
} from "@/features/audit/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

const PAGE_SIZE = 50;

/** Convert datetime-local value to ISO 8601 for the API. */
function toIsoOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function AuditLogsPage() {
  const { can } = usePermissions();
  const canAccess = can(ADMIN_PERMISSIONS.AUDIT_READ);

  const [tab, setTab] = useState<AuditTab>("audit");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [actorAdminId, setActorAdminId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [eventType, setEventType] = useState<AdminSecurityEventType | null>(
    null,
  );
  const [severity, setSeverity] = useState<SecuritySeverity | null>(null);
  const [adminId, setAdminId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 400);

  useAuditUrlState({
    tab,
    setTab,
    debouncedSearch,
    setSearch,
    action,
    setAction,
    entityType,
    setEntityType,
    actorAdminId,
    setActorAdminId,
    tenantId,
    setTenantId,
    from,
    setFrom,
    to,
    setTo,
    eventType,
    setEventType,
    severity,
    setSeverity,
    adminId,
    setAdminId,
    page,
    setPage,
    selectedId,
    setSelectedId,
  });

  const fromIso = toIsoOrUndefined(from);
  const toIso = toIsoOrUndefined(to);

  const auditQuery = useAuditLogs(
    {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      action: action.trim() || undefined,
      entityType: entityType.trim() || undefined,
      actorAdminId: actorAdminId.trim() || undefined,
      tenantId: tenantId.trim() || undefined,
      from: fromIso,
      to: toIso,
    },
    { enabled: canAccess && tab === "audit" },
  );

  const securityQuery = useSecurityEvents(
    {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      eventType: eventType ?? undefined,
      severity: severity ?? undefined,
      adminId: adminId.trim() || undefined,
      from: fromIso,
      to: toIso,
    },
    { enabled: canAccess && tab === "security" },
  );

  if (!canAccess) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <AuditHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Access denied</CardTitle>
            <CardDescription>
              You need audit.read to view audit logs and security events.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const activeQuery = tab === "audit" ? auditQuery : securityQuery;
  const { data, isLoading, isError, isFetching, refetch } = activeQuery;
  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const hasFilters =
    debouncedSearch.trim().length > 0 ||
    from.trim().length > 0 ||
    to.trim().length > 0 ||
    (tab === "audit"
      ? action.trim().length > 0 ||
        entityType.trim().length > 0 ||
        actorAdminId.trim().length > 0 ||
        tenantId.trim().length > 0
      : eventType !== null ||
        severity !== null ||
        adminId.trim().length > 0);

  const handleTabChange = (next: AuditTab) => {
    setTab(next);
    setPage(1);
    setSelectedId(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const resetPage = () => setPage(1);

  const handleClearFilters = () => {
    setSearch("");
    setAction("");
    setEntityType("");
    setActorAdminId("");
    setTenantId("");
    setFrom("");
    setTo("");
    setEventType(null);
    setSeverity(null);
    setAdminId("");
    setPage(1);
  };

  if (isLoading && !data) {
    return <AuditSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <AuditHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load{" "}
              {tab === "audit" ? "audit logs" : "security events"}
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch the activity trail. Check your connection
              and try again.
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
    <div className="space-y-4 px-6 py-5 md:px-8">
      <AuditHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <AuditToolbar
          tab={tab}
          onTabChange={handleTabChange}
          search={search}
          onSearchChange={handleSearchChange}
          action={action}
          onActionChange={(value) => {
            setAction(value);
            resetPage();
          }}
          entityType={entityType}
          onEntityTypeChange={(value) => {
            setEntityType(value);
            resetPage();
          }}
          actorAdminId={actorAdminId}
          onActorAdminIdChange={(value) => {
            setActorAdminId(value);
            resetPage();
          }}
          tenantId={tenantId}
          onTenantIdChange={(value) => {
            setTenantId(value);
            resetPage();
          }}
          from={from}
          onFromChange={(value) => {
            setFrom(value);
            resetPage();
          }}
          to={to}
          onToChange={(value) => {
            setTo(value);
            resetPage();
          }}
          eventType={eventType}
          onEventTypeChange={(value) => {
            setEventType(value);
            resetPage();
          }}
          severity={severity}
          onSeverityChange={(value) => {
            setSeverity(value);
            resetPage();
          }}
          adminId={adminId}
          onAdminIdChange={(value) => {
            setAdminId(value);
            resetPage();
          }}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? items.length}
          isFetching={isFetching}
        />

        {items.length === 0 ? (
          <AuditEmptyState hasFilters={hasFilters} tab={tab} />
        ) : (
          <>
            {tab === "audit" ? (
              <AuditTable
                logs={auditQuery.data?.items ?? []}
                onSelect={setSelectedId}
              />
            ) : (
              <SecurityEventsTable
                events={securityQuery.data?.items ?? []}
                onSelect={setSelectedId}
              />
            )}
            {pagination ? (
              <AuditPagination
                pagination={pagination}
                onPageChange={setPage}
                noun={tab === "audit" ? "logs" : "events"}
              />
            ) : null}
          </>
        )}
      </div>

      <AuditDetailSheet
        tab={tab}
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
