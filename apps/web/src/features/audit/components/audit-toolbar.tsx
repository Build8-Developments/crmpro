"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditActionFilter, AuditEntityTypeFilter } from "@/features/audit/types";
import {
  AUDIT_ACTION_FILTER_OPTIONS,
  AUDIT_ENTITY_FILTER_OPTIONS,
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
  totalItems: number;
  isFetching?: boolean;
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
  totalItems,
  isFetching,
}: AuditToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
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
      </div>
    </div>
  );
}
