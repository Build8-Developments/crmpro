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
import { usePermissions } from "@/hooks/use-permissions";
import { LEAD_SCOPE_LABELS, useLeadScope } from "@/hooks/use-lead-scope";
import { LeadsFiltersSheet } from "./leads-filters-sheet";
import { ActiveFilterBadges } from "./active-filter-badges";
import { LeadsExportButton } from "./leads-export-button";

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
  /** Column / density menu for the table below. */
  viewMenu?: React.ReactNode;
}

/** One-tap views a sales manager uses all day (workflow spec §3.5). */
const QUICK_CHIPS: Array<{
  id: string;
  label: string;
  isActive: (filters: LeadsTableFilters) => boolean;
  on: Partial<LeadsTableFilters>;
  off: Partial<LeadsTableFilters>;
}> = [
  {
    id: "unassigned",
    label: "Unassigned",
    isActive: (f) => Boolean(f.unassignedOnly),
    on: { unassignedOnly: true, assignees: undefined },
    off: { unassignedOnly: undefined },
  },
  {
    id: "no-next-step",
    label: "No next step",
    isActive: (f) => f.nextStep === "none",
    on: { nextStep: "none" },
    off: { nextStep: undefined },
  },
  {
    id: "overdue",
    label: "Overdue",
    isActive: (f) => f.nextStep === "overdue",
    on: { nextStep: "overdue" },
    off: { nextStep: undefined },
  },
  {
    id: "never",
    label: "Never contacted",
    isActive: (f) => f.lastContact === "never",
    on: { lastContact: "never", openOnly: true },
    off: { lastContact: undefined, openOnly: undefined },
  },
  {
    id: "hot",
    label: "Hot",
    isActive: (f) => f.heat?.length === 1 && f.heat[0] === "HOT",
    on: { heat: ["HOT"] },
    off: { heat: undefined },
  },
  {
    id: "stale",
    label: "Stale",
    isActive: (f) => Boolean(f.staleOnly),
    on: { staleOnly: true },
    off: { staleOnly: undefined },
  },
  {
    id: "stuck",
    label: "Stuck",
    isActive: (f) => Boolean(f.stuck),
    on: { stuck: true },
    off: { stuck: undefined },
  },
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
  viewMenu,
}: LeadsToolbarProps) {
  const openCreateDialog = useLeadUiStore((s) => s.openCreateDialog);
  const openTransferDialog = useLeadUiStore((s) => s.openTransferDialog);
  const { can } = usePermissions();
  const leadScope = useLeadScope();
  const activeFilterCount = countActiveLeadFilters(filters);
  const sheetFilterCount = activeFilterCount;

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

        <LeadsFiltersSheet
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClearFilters={onClearFilters}
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
        {leadScope !== "all" ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            title="Leads assigned to other people are not visible to you."
          >
            <AppIcons.eye className="size-3" />
            {LEAD_SCOPE_LABELS[leadScope]}
          </span>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {viewMenu}
          {can("lead.assign") ? (
            <Button variant="outline" size="sm" className="h-8" onClick={openTransferDialog}>
              <AppIcons.stageChange className="size-3.5" />
              Transfer
            </Button>
          ) : null}
          <LeadsExportButton />
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
        {QUICK_CHIPS.map((chip) => {
          const active = chip.isActive(filters);
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFiltersChange(active ? chip.off : chip.on)}
              className={cn(
                "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {chip.label}
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
