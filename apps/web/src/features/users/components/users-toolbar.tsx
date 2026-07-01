"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleOption, UserStatusFilter } from "@/features/users/types";
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
  totalItems,
  isFetching,
}: UsersToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or email..."
          className="h-8 pl-8 text-xs"
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching ? (
          <AppIcons.loader className="size-3.5 animate-spin" />
        ) : null}
        <span className={cn("font-medium tabular-nums text-foreground")}>
          {formatNumber(totalItems)} users
        </span>
      </div>
    </div>
  );
}
