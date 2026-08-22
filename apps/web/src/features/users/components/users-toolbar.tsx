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
import { useUserQuota } from "@/features/users/hooks";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import type { RoleOption, UserStatusFilter } from "@/features/users/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UsersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleId: string | null;
  onRoleIdChange: (roleId: string | null) => void;
  roleOptions: RoleOption[];
  rolesLoading?: boolean;
  statusFilter: UserStatusFilter;
  onStatusFilterChange: (filter: UserStatusFilter) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function UsersToolbar({
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
}: UsersToolbarProps) {
  const openCreateDialog = useUserUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();
  const { data: quota } = useUserQuota();
  
  const isAtQuotaLimit = quota && quota.maxUsers !== null && quota.currentUsers >= quota.maxUsers;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email..."
          className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
          aria-label="Search users"
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
          onStatusFilterChange(value as UserStatusFilter)
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
        {formatNumber(totalItems)} users
      </span>

      {can("user.create") ? (
        <div className="ml-auto flex items-center gap-3">
          {quota && quota.maxUsers !== null ? (
            <span className={cn("text-xs", isAtQuotaLimit ? "text-destructive font-medium" : "text-muted-foreground")}>
              Quota: {quota.currentUsers} / {quota.maxUsers}
            </span>
          ) : null}
          <Button
            size="sm"
            className="h-8"
            onClick={openCreateDialog}
            disabled={isAtQuotaLimit ?? false}
            title={isAtQuotaLimit ? "User quota exceeded for current subscription plan" : undefined}
          >
            <AppIcons.create className="size-3.5" />
            New user
          </Button>
        </div>
      ) : null}
    </div>
  );
}
