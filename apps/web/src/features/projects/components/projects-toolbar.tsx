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
import { useProjectUiStore } from "@/features/projects/stores/project-ui-store";
import type { ProjectStatusFilter } from "@/features/projects/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DeveloperOption {
  id: string;
  name: string;
}

const STATUS_CHIPS: Array<{ value: ProjectStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

interface ProjectsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  developerId: string | null;
  onDeveloperIdChange: (developerId: string | null) => void;
  developerOptions: DeveloperOption[];
  developersLoading?: boolean;
  statusFilter: ProjectStatusFilter;
  onStatusFilterChange: (filter: ProjectStatusFilter) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
  totalItems: number;
  isFetching?: boolean;
}

export function ProjectsToolbar({
  search,
  onSearchChange,
  developerId,
  onDeveloperIdChange,
  developerOptions,
  developersLoading,
  statusFilter,
  onStatusFilterChange,
  hasFilters,
  onClearFilters,
  totalItems,
  isFetching,
}: ProjectsToolbarProps) {
  const openCreateDialog = useProjectUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="space-y-3 border-b border-border/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects..."
            className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
            aria-label="Search projects"
          />
        </div>

        <Select
          value={developerId ?? "all"}
          onValueChange={(value) =>
            onDeveloperIdChange(value === "all" ? null : value)
          }
          disabled={developersLoading}
        >
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="All developers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All developers</SelectItem>
            {developerOptions.map((developer) => (
              <SelectItem key={developer.id} value={developer.id}>
                {developer.name}
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
            "text-xs tabular-nums text-muted-foreground",
            isFetching && "opacity-70",
          )}
        >
          {formatNumber(totalItems)} projects
        </span>

        {can("project.create") ? (
          <Button
            size="sm"
            className="ml-auto h-8"
            onClick={openCreateDialog}
          >
            <AppIcons.create className="size-3.5" />
            New project
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1">
        {STATUS_CHIPS.map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onStatusFilterChange(chip.value)}
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
