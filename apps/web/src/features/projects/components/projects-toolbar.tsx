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
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProjectStatusFilter } from "@/features/projects/types";

interface DeveloperOption {
  id: string;
  name: string;
}

interface ProjectsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  developerId: string | null;
  onDeveloperIdChange: (developerId: string | null) => void;
  developerOptions: DeveloperOption[];
  developersLoading?: boolean;
  statusFilter: ProjectStatusFilter;
  onStatusFilterChange: (filter: ProjectStatusFilter) => void;
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
  totalItems,
  isFetching,
}: ProjectsToolbarProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search projects..."
            className="h-8 pl-8 text-xs"
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
          <SelectTrigger className="h-8 w-[10.5rem] text-xs">
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

        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as ProjectStatusFilter)
          }
        >
          <SelectTrigger className="h-8 w-[7.5rem] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching ? (
            <AppIcons.loader className="size-3.5 animate-spin" />
          ) : null}
          <span className={cn("font-medium tabular-nums text-foreground")}>
            {formatNumber(totalItems)} projects
          </span>
        </div>
      </div>
    </div>
  );
}
