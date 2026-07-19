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
import type {
  AuditActionFilter,
  AuditEntityTypeFilter,
} from "@/features/audit/types";
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_ENTITY_FILTER_OPTIONS,
  toDateInputValue,
} from "@/features/audit/utils/audit-labels";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ActorOption {
  id: string;
  label: string;
}

interface AuditToolbarProps {
  actorUserId: string | null;
  onActorUserIdChange: (userId: string | null) => void;
  actorOptions: ActorOption[];
  actorsLoading?: boolean;
  entityTypeFilter: AuditEntityTypeFilter;
  onEntityTypeFilterChange: (filter: AuditEntityTypeFilter) => void;
  actionFilter: AuditActionFilter;
  onActionFilterChange: (filter: AuditActionFilter) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInputValue(date);
}

export function AuditToolbar({
  actorUserId,
  onActorUserIdChange,
  actorOptions,
  actorsLoading,
  entityTypeFilter,
  onEntityTypeFilterChange,
  actionFilter,
  onActionFilterChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
}: AuditToolbarProps) {
  const applyPreset = (days: number | null) => {
    if (days === null) {
      onFromDateChange("");
      onToDateChange("");
      return;
    }
    onFromDateChange(daysAgo(days));
    onToDateChange(toDateInputValue(new Date()));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={actorUserId ?? "all"}
          onValueChange={(value) =>
            onActorUserIdChange(value === "all" ? null : value)
          }
          disabled={actorsLoading}
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="All actors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actors</SelectItem>
            {actorOptions.map((actor) => (
              <SelectItem key={actor.id} value={actor.id}>
                {actor.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={entityTypeFilter}
          onValueChange={(value) =>
            onEntityTypeFilterChange(value as AuditEntityTypeFilter)
          }
        >
          <SelectTrigger className="h-8 w-[10.5rem] text-xs">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_ENTITY_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionFilter}
          onValueChange={(value) =>
            onActionFilterChange(value as AuditActionFilter)
          }
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            {AUDIT_ACTION_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
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
            "ml-auto text-xs text-muted-foreground",
            isFetching && "opacity-70",
          )}
        >
          {formatNumber(totalItems)} events
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          className="h-8 w-[10.5rem] text-xs"
          aria-label="From date"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          className="h-8 w-[10.5rem] text-xs"
          aria-label="To date"
        />

        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => applyPreset(0)}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => applyPreset(7)}
          >
            7 days
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => applyPreset(30)}
          >
            30 days
          </Button>
        </div>
      </div>
    </div>
  );
}
