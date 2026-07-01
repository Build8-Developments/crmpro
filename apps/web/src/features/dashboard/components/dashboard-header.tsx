"use client";

import { cn } from "@/lib/utils";
import type { DashboardRange } from "@/features/dashboard/types";
import { Button } from "@/components/ui/button";

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

interface DashboardHeaderProps {
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  range,
  onRangeChange,
  isRefreshing = false,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Updating…
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Monitor sales performance and pipeline health
        </p>
      </div>

      <div
        className="inline-flex items-center rounded-lg border bg-muted/40 p-1"
        role="group"
        aria-label="Date range"
      >
        {RANGES.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={range === item.value ? "default" : "ghost"}
            className={cn(
              "min-w-12 rounded-md px-3 transition-all duration-200",
              range !== item.value && "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onRangeChange(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
