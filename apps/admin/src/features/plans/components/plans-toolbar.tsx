"use client";

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
import {
  PLAN_CURRENCY_OPTIONS,
  type PlanStatusFilter,
} from "@/features/plans/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlansToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: PlanStatusFilter;
  onStatusFilterChange: (filter: PlanStatusFilter) => void;
  currency: string | null;
  onCurrencyChange: (currency: string | null) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
  onCreate: () => void;
}

export function PlansToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currency,
  onCurrencyChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
  onCreate,
}: PlansToolbarProps) {
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search plans..."
          className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
          aria-label="Search plans"
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          onStatusFilterChange(value as PlanStatusFilter)
        }
      >
        <SelectTrigger className="h-8 w-[7.5rem] text-xs" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Archived</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currency ?? "all"}
        onValueChange={(value) =>
          onCurrencyChange(value === "all" ? null : value)
        }
      >
        <SelectTrigger className="h-8 w-[7.5rem] text-xs" size="sm">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All currencies</SelectItem>
          {PLAN_CURRENCY_OPTIONS.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
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
        {formatNumber(totalItems)} plans
      </span>

      {can(ADMIN_PERMISSIONS.PLAN_CREATE) ? (
        <Button size="sm" className="ml-auto h-8" onClick={onCreate}>
          <AppIcons.create className="size-3.5" />
          New plan
        </Button>
      ) : null}
    </div>
  );
}
