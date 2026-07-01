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
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { countActiveLeadFilters } from "@/features/leads/utils/lead-filters";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import { LEADS_PAGE_SIZE_OPTIONS } from "@/features/leads/utils/lead-filters";
import { LeadsFiltersSheet } from "./leads-filters-sheet";
import { ActiveFilterBadges } from "./active-filter-badges";

interface LeadsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  totalItems: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  filters: LeadsTableFilters;
  onFiltersChange: (filters: Partial<LeadsTableFilters>) => void;
  onClearFilters: () => void;
  isFetching?: boolean;
}

export function LeadsToolbar({
  search,
  onSearchChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  filters,
  onFiltersChange,
  onClearFilters,
  isFetching,
}: LeadsToolbarProps) {
  const activeFilterCount = countActiveLeadFilters(filters);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email, phone..."
            className="h-8 pl-8 text-xs"
            aria-label="Search leads"
          />
        </div>
        <LeadsFiltersSheet
          filters={filters}
          onFiltersChange={onFiltersChange}
          activeCount={activeFilterCount}
        />
        {activeFilterCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={onClearFilters}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="shrink-0">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-[4.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEADS_PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isFetching ? (
          <AppIcons.loader className="size-3.5 animate-spin" />
        ) : null}
        <span className={cn("font-medium tabular-nums text-foreground")}>
          {formatNumber(totalItems)} leads
        </span>
      </div>
      </div>
      <ActiveFilterBadges
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
}
