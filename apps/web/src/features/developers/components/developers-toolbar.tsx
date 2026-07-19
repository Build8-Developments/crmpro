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
import { useDeveloperUiStore } from "@/features/developers/stores/developer-ui-store";
import type { DevelopersSortField } from "@/features/developers/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DevelopersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: DevelopersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (
    sortBy: DevelopersSortField,
    sortOrder: "asc" | "desc",
  ) => void;
  hasSearch: boolean;
  onClearSearch: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function DevelopersToolbar({
  search,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  hasSearch,
  onClearSearch,
  totalItems,
  isFetching,
}: DevelopersToolbarProps) {
  const openCreateDialog = useDeveloperUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();
  const sortValue = `${sortBy}:${sortOrder}`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search developers..."
          className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
          aria-label="Search developers"
        />
      </div>

      <Select
        value={sortValue}
        onValueChange={(value) => {
          const [nextSortBy, nextSortOrder] = value.split(":") as [
            DevelopersSortField,
            "asc" | "desc",
          ];
          onSortChange(nextSortBy, nextSortOrder);
        }}
      >
        <SelectTrigger className="h-8 w-[10rem] text-xs">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name:asc">Name A–Z</SelectItem>
          <SelectItem value="name:desc">Name Z–A</SelectItem>
          <SelectItem value="updatedAt:desc">Recently updated</SelectItem>
          <SelectItem value="createdAt:desc">Newest first</SelectItem>
        </SelectContent>
      </Select>

      {hasSearch ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={onClearSearch}
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
        {formatNumber(totalItems)} developers
      </span>

      {can("developer.create") ? (
        <Button size="sm" className="ml-auto h-8" onClick={openCreateDialog}>
          <AppIcons.create className="size-3.5" />
          New developer
        </Button>
      ) : null}
    </div>
  );
}
