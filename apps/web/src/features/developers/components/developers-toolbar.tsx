"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DevelopersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  totalItems: number;
  isFetching?: boolean;
}

export function DevelopersToolbar({
  search,
  onSearchChange,
  totalItems,
  isFetching,
}: DevelopersToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search developers..."
          className="h-8 pl-8 text-xs"
          aria-label="Search developers"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isFetching ? (
          <AppIcons.loader className="size-3.5 animate-spin" />
        ) : null}
        <span className={cn("font-medium tabular-nums text-foreground")}>
          {formatNumber(totalItems)} developers
        </span>
      </div>
    </div>
  );
}
