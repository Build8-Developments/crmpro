"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FileCategoryFilter } from "@/features/files/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FilesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: FileCategoryFilter;
  onCategoryFilterChange: (filter: FileCategoryFilter) => void;
  totalItems: number;
  isFetching?: boolean;
}

export function FilesToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  totalItems,
  isFetching,
}: FilesToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by filename..."
            className="h-8 pl-8 text-xs"
            aria-label="Search files"
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(value) =>
            onCategoryFilterChange(value as FileCategoryFilter)
          }
        >
          <SelectTrigger className="h-8 w-[10.5rem] text-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="LEAD_ATTACHMENT">Lead attachments</SelectItem>
            <SelectItem value="IMPORT_FILE">Imports</SelectItem>
            <SelectItem value="EXPORT_FILE">Exports</SelectItem>
            <SelectItem value="PROJECT_BROCHURE">Project brochures</SelectItem>
            <SelectItem value="AVATAR">Avatars</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <span
          className={cn(
            "ml-auto text-xs text-muted-foreground",
            isFetching && "opacity-70",
          )}
        >
          {formatNumber(totalItems)} files
        </span>
      </div>
    </div>
  );
}
