"use client";

import Link from "next/link";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
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
import type { TenantStatusFilter } from "@/features/tenants/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TenantsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TenantStatusFilter;
  onStatusFilterChange: (filter: TenantStatusFilter) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function TenantsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
}: TenantsToolbarProps) {
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or slug..."
          className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
          aria-label="Search tenants"
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          onStatusFilterChange(value as TenantStatusFilter)
        }
      >
        <SelectTrigger className="h-8 w-[8.5rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="TRIAL">Trial</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="SUSPENDED">Suspended</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
        {formatNumber(totalItems)} tenants
      </span>

      {can(ADMIN_PERMISSIONS.TENANT_CREATE) ? (
        <Button size="sm" className="ml-auto h-8" asChild>
          <Link href="/tenants/new">
            <AppIcons.create className="size-3.5" />
            New tenant
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
