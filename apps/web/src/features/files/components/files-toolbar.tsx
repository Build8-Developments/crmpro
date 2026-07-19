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
import type { FileCategoryFilter, FilesSortField } from "@/features/files/types";
import { useFileUiStore } from "@/features/files/stores/file-ui-store";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

const CATEGORY_CHIPS: Array<{ value: FileCategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "LEAD_ATTACHMENT", label: "Leads" },
  { value: "IMPORT_FILE", label: "Imports" },
  { value: "EXPORT_FILE", label: "Exports" },
  { value: "PROJECT_BROCHURE", label: "Brochures" },
  { value: "OTHER", label: "Other" },
];

interface FilesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: FileCategoryFilter;
  onCategoryFilterChange: (filter: FileCategoryFilter) => void;
  sortBy: FilesSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: FilesSortField, sortOrder: "asc" | "desc") => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function FilesToolbar({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
}: FilesToolbarProps) {
  const openUploadDialog = useFileUiStore((s) => s.openUploadDialog);
  const { can } = usePermissions();

  const sortValue = `${sortBy}:${sortOrder}`;

  return (
    <div className="space-y-3 border-b border-border/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search files..."
            className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
            aria-label="Search files"
          />
        </div>

        <Select
          value={sortValue}
          onValueChange={(value) => {
            const [nextSortBy, nextSortOrder] = value.split(":") as [
              FilesSortField,
              "asc" | "desc",
            ];
            onSortChange(nextSortBy, nextSortOrder);
          }}
        >
          <SelectTrigger className="h-8 w-[10.5rem] text-xs">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="originalFilename:asc">Name A–Z</SelectItem>
            <SelectItem value="originalFilename:desc">Name Z–A</SelectItem>
            <SelectItem value="sizeBytes:desc">Largest first</SelectItem>
            <SelectItem value="sizeBytes:asc">Smallest first</SelectItem>
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
            "text-xs tabular-nums text-muted-foreground",
            isFetching && "opacity-70",
          )}
        >
          {formatNumber(totalItems)} files
        </span>

        {can("file.upload") ? (
          <Button size="sm" className="ml-auto h-8" onClick={openUploadDialog}>
            <AppIcons.upload className="size-3.5" />
            Upload
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        {CATEGORY_CHIPS.map((chip) => {
          const active = categoryFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onCategoryFilterChange(chip.value)}
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
    </div>
  );
}
