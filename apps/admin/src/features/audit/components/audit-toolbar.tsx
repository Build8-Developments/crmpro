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
  AdminSecurityEventType,
  AuditTab,
  SecuritySeverity,
} from "@/features/audit/types";
import {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
} from "@/features/audit/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AuditToolbarProps {
  tab: AuditTab;
  onTabChange: (tab: AuditTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  action: string;
  onActionChange: (value: string) => void;
  entityType: string;
  onEntityTypeChange: (value: string) => void;
  actorAdminId: string;
  onActorAdminIdChange: (value: string) => void;
  tenantId: string;
  onTenantIdChange: (value: string) => void;
  from: string;
  onFromChange: (value: string) => void;
  to: string;
  onToChange: (value: string) => void;
  eventType: AdminSecurityEventType | null;
  onEventTypeChange: (value: AdminSecurityEventType | null) => void;
  severity: SecuritySeverity | null;
  onSeverityChange: (value: SecuritySeverity | null) => void;
  adminId: string;
  onAdminIdChange: (value: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function AuditToolbar({
  tab,
  onTabChange,
  search,
  onSearchChange,
  action,
  onActionChange,
  entityType,
  onEntityTypeChange,
  actorAdminId,
  onActorAdminIdChange,
  tenantId,
  onTenantIdChange,
  from,
  onFromChange,
  to,
  onToChange,
  eventType,
  onEventTypeChange,
  severity,
  onSeverityChange,
  adminId,
  onAdminIdChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
}: AuditToolbarProps) {
  return (
    <div className="border-b border-border/50">
      <div className="flex gap-1 px-4 pt-3">
        <TabButton
          active={tab === "audit"}
          onClick={() => onTabChange("audit")}
          label="Audit"
        />
        <TabButton
          active={tab === "security"}
          onClick={() => onTabChange("security")}
          label="Security Events"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search…"
            className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
            aria-label="Search logs"
          />
        </div>

        {tab === "audit" ? (
          <>
            <Input
              value={action}
              onChange={(event) => onActionChange(event.target.value)}
              placeholder="Action"
              className="h-8 w-[8.5rem] text-xs"
              aria-label="Filter by action"
            />
            <Input
              value={entityType}
              onChange={(event) => onEntityTypeChange(event.target.value)}
              placeholder="Entity type"
              className="h-8 w-[8.5rem] text-xs"
              aria-label="Filter by entity type"
            />
            <Input
              value={actorAdminId}
              onChange={(event) => onActorAdminIdChange(event.target.value)}
              placeholder="Actor admin ID"
              className="h-8 w-[11rem] text-xs"
              aria-label="Filter by actor admin ID"
            />
            <Input
              value={tenantId}
              onChange={(event) => onTenantIdChange(event.target.value)}
              placeholder="Tenant ID"
              className="h-8 w-[11rem] text-xs"
              aria-label="Filter by tenant ID"
            />
          </>
        ) : (
          <>
            <Select
              value={eventType ?? "all"}
              onValueChange={(value) =>
                onEventTypeChange(
                  value === "all" ? null : (value as AdminSecurityEventType),
                )
              }
            >
              <SelectTrigger className="h-8 w-[11rem] text-xs">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {SECURITY_EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={severity ?? "all"}
              onValueChange={(value) =>
                onSeverityChange(
                  value === "all" ? null : (value as SecuritySeverity),
                )
              }
            >
              <SelectTrigger className="h-8 w-[8rem] text-xs">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SECURITY_SEVERITIES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={adminId}
              onChange={(event) => onAdminIdChange(event.target.value)}
              placeholder="Admin ID"
              className="h-8 w-[11rem] text-xs"
              aria-label="Filter by admin ID"
            />
          </>
        )}

        <Input
          type="datetime-local"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-8 w-[11.5rem] text-xs"
          aria-label="From date"
        />
        <Input
          type="datetime-local"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="h-8 w-[11.5rem] text-xs"
          aria-label="To date"
        />

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
          {formatNumber(totalItems)}{" "}
          {tab === "audit" ? "logs" : "events"}
        </span>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
