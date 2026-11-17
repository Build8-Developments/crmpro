"use client";

import Link from "next/link";
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
import {
  countActiveLeadFilters,
  LEADS_PAGE_SIZE_OPTIONS,
} from "@/features/leads/utils/lead-filters";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { useTranslations } from "next-intl";
import { useLeadScope } from "@/hooks/use-lead-scope";
import { usePermissions } from "@/hooks/use-permissions";
import { LeadsFiltersSheet } from "./leads-filters-sheet";
import { SavedViewsMenu } from "@/features/saved-views/components/saved-views-menu";
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

type QuickChipKey =
  | "unassignedOnly"
  | "staleOnly"
  | "neverContacted"
  | "noFollowUp"
  | "slaBreached";

const QUICK_CHIPS: Array<{ key: QuickChipKey; label?: string }> = [
  { key: "neverContacted" },
  { key: "noFollowUp" },
  { key: "slaBreached" },
  { key: "unassignedOnly", label: "Unassigned" },
  { key: "staleOnly", label: "Stale" },
];

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
  const openCreateDialog = useLeadUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();
  const leadScope = useLeadScope();
  const tQuick = useTranslations("leads.quickFilters");
  const activeFilterCount = countActiveLeadFilters(filters);
  const sheetFilterCount =
    activeFilterCount -
    (filters.unassignedOnly ? 1 : 0) -
    (filters.staleOnly ? 1 : 0) -
    (filters.neverContacted ? 1 : 0) -
    (filters.noFollowUp ? 1 : 0) -
    (filters.slaBreached ? 1 : 0);

  return (
    <div className="space-y-3 border-b border-border/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email, phone..."
            className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
            aria-label="Search leads"
          />
        </div>

        <SavedViewsMenu />
        <LeadsFiltersSheet
          filters={filters}
          onFiltersChange={onFiltersChange}
          activeCount={sheetFilterCount}
        />

        {activeFilterCount > 0 || search.trim().length > 0 ? (
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

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

        <span
          className={cn(
            "text-xs tabular-nums text-muted-foreground",
            isFetching && "opacity-70",
          )}
        >
          {formatNumber(totalItems)} leads
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {can("import-job.create") ? (
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/imports">
                <AppIcons.upload className="size-3.5" />
                Import CSV
              </Link>
            </Button>
          ) : null}
          {can("lead.create") ? (
            <Button size="sm" className="h-8" onClick={openCreateDialog}>
              <AppIcons.create className="size-3.5" />
              Add Lead
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {QUICK_CHIPS.filter(
          // Own-scope users never see unassigned leads.
          (chip) =>
            (chip.key !== "unassignedOnly" && chip.key !== "slaBreached") ||
            leadScope !== "own",
        ).map((chip) => {
          const active = Boolean(filters[chip.key]);
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() =>
                onFiltersChange({
                  [chip.key]: active ? undefined : true,
                })
              }
              className={cn(
                "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {chip.label ??
                tQuick(
                  chip.key as "neverContacted" | "noFollowUp" | "slaBreached",
                )}
            </button>
          );
        })}
      </div>

      <ActiveFilterBadges
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    </div>
  );
}
