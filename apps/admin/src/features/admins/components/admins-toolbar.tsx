"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import type {
  AdminRoleSummary,
  AdminStatusFilter,
} from "@/features/admins/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface AdminsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleId: string | null;
  onRoleIdChange: (roleId: string | null) => void;
  roleOptions: AdminRoleSummary[];
  rolesLoading?: boolean;
  statusFilter: AdminStatusFilter;
  onStatusFilterChange: (filter: AdminStatusFilter) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function AdminsToolbar({
  search,
  onSearchChange,
  roleId,
  onRoleIdChange,
  roleOptions,
  rolesLoading,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
}: AdminsToolbarProps) {
  const openCreateDialog = useAdminUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email..."
          className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
          aria-label="Search admins"
        />
      </div>

      <Select
        value={roleId ?? "all"}
        onValueChange={(value) =>
          onRoleIdChange(value === "all" ? null : value)
        }
        disabled={rolesLoading}
      >
        <SelectTrigger className="h-8 w-[9.5rem] text-xs">
          <SelectValue placeholder="All roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {roleOptions.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          onStatusFilterChange(value as AdminStatusFilter)
        }
      >
        <SelectTrigger className="h-8 w-[7.5rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={onClearFilters}
        >
          <AppIcons.close className="size-3.5" />
          Clear
        </Button>
      ) : null}

      <span
        className={cn(
          "text-xs tabular-nums text-muted-foreground",
          isFetching && "opacity-70",
        )}
      >
        {formatNumber(totalItems)} admins
      </span>

      {can(ADMIN_PERMISSIONS.ADMIN_MANAGE) ? (
        <Button
          size="sm"
          className="ml-auto h-8"
          onClick={openCreateDialog}
        >
          <AppIcons.create className="size-3.5" />
          New admin
        </Button>
      ) : null}
    </div>
  );
}
