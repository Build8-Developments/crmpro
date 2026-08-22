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
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export type RoleFilter = "all" | "system" | "custom";
export type RoleSort = "users" | "permissions" | "newest";

interface RolesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: RoleFilter;
  onFilterChange: (value: RoleFilter) => void;
  sort: RoleSort;
  onSortChange: (value: RoleSort) => void;
}

export function RolesToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: RolesToolbarProps) {
  const openCreateDialog = useRoleUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search roles..."
          className="h-9 pl-9"
          aria-label="Search roles"
        />
      </div>

      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue placeholder="Role Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="system">System Roles</SelectItem>
          <SelectItem value="custom">Custom Roles</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="Sort By" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="users">Most Users</SelectItem>
          <SelectItem value="permissions">Most Permissions</SelectItem>
          <SelectItem value="newest">Newest First</SelectItem>
        </SelectContent>
      </Select>

      {can("role.manage") ? (
        <Button size="sm" onClick={openCreateDialog} className="ml-auto h-9">
          <AppIcons.create className="mr-2 size-4" />
          New Role
        </Button>
      ) : null}
    </div>
  );
}
