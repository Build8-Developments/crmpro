"use client";

import { useCallback, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminConfirmDialogs } from "@/features/admins/components/admin-confirm-dialogs";
import { AdminsEmptyState } from "@/features/admins/components/admins-empty-state";
import { AdminsHeader } from "@/features/admins/components/admins-header";
import { AdminsPagination } from "@/features/admins/components/admins-pagination";
import { AdminsSkeleton } from "@/features/admins/components/admins-skeleton";
import { AdminsTable } from "@/features/admins/components/admins-table";
import { AdminsToolbar } from "@/features/admins/components/admins-toolbar";
import { CreateAdminDialog } from "@/features/admins/components/create-admin-dialog";
import { EditAdminDialog } from "@/features/admins/components/edit-admin-dialog";
import { ResetAdminPasswordDialog } from "@/features/admins/components/reset-admin-password-dialog";
import { useAdminRoles, useAdmins } from "@/features/admins/hooks";
import { useAdminsUrlState } from "@/features/admins/hooks/use-admins-url-state";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import type { AdminStatusFilter } from "@/features/admins/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOpenCreateFromQuery } from "@/hooks/use-open-create-from-query";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

const ADMINS_PAGE_SIZE = 50;

export function AdminsPage() {
  const { canAny } = usePermissions();
  const canAccess = canAny([
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  ]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all");
  const debouncedSearch = useDebouncedValue(search, 400);
  const highlightedAdminId = useAdminUiStore((s) => s.highlightedAdminId);
  const openCreateDialog = useAdminUiStore((s) => s.openCreateDialog);
  const handleCreate = useCallback(() => {
    openCreateDialog();
  }, [openCreateDialog]);

  useOpenCreateFromQuery(handleCreate);

  useAdminsUrlState({
    debouncedSearch,
    setSearch,
    roleId,
    setRoleId,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
  });

  const { data: rolesData, isLoading: rolesLoading } = useAdminRoles({
    enabled: canAccess,
  });

  const { data, isLoading, isError, isFetching, refetch } = useAdmins(
    {
      page,
      limit: ADMINS_PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      roleId: roleId ?? undefined,
      isActive:
        statusFilter === "all"
          ? undefined
          : statusFilter === "active"
            ? true
            : false,
    },
    { enabled: canAccess },
  );

  if (!canAccess) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <AdminsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Access denied</CardTitle>
            <CardDescription>
              You need admin.manage or audit.read to view platform admins.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const admins = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters =
    debouncedSearch.trim().length > 0 ||
    roleId !== null ||
    statusFilter !== "all";
  const isEmpty = admins.length === 0;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleIdChange = (value: string | null) => {
    setRoleId(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: AdminStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setRoleId(null);
    setStatusFilter("all");
    setPage(1);
  };

  if (isLoading && !data) {
    return <AdminsSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <AdminsHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load admins
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch platform staff. Check your connection and
              try again.
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
      <AdminsHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <AdminsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          roleId={roleId}
          onRoleIdChange={handleRoleIdChange}
          roleOptions={rolesData ?? []}
          rolesLoading={rolesLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
          totalItems={pagination?.totalItems ?? admins.length}
          isFetching={isFetching}
        />

        {isEmpty ? (
          <AdminsEmptyState hasFilters={hasFilters} />
        ) : (
          <>
            <AdminsTable
              admins={admins}
              highlightedAdminId={highlightedAdminId}
            />
            {pagination ? (
              <AdminsPagination
                pagination={pagination}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>

      <CreateAdminDialog />
      <EditAdminDialog />
      <ResetAdminPasswordDialog />
      <AdminConfirmDialogs />
    </div>
  );
}
