"use client";

import { useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import { LEAD_STATUS_OPTIONS } from "@/features/leads/utils/lead-filters";
import { useLeadScope } from "@/hooks/use-lead-scope";
import { FilterSelect } from "./filter-select";

interface LeadsFiltersSheetProps {
  filters: LeadsTableFilters;
  onFiltersChange: (filters: Partial<LeadsTableFilters>) => void;
  activeCount: number;
}

type FilterFieldId =
  | "status"
  | "pipeline"
  | "stage"
  | "source"
  | "assignee"
  | "project";

export function LeadsFiltersSheet({
  filters,
  onFiltersChange,
  activeCount,
}: LeadsFiltersSheetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // Own-scope users only ever see their own leads; an assignee filter is noise.
  const leadScope = useLeadScope();
  const [openFilter, setOpenFilter] = useState<FilterFieldId | null>(null);

  const { pipelines, sources, users, projects } = useLeadFilterOptions();

  const stageOptions = useMemo(() => {
    if (!filters.pipelineId) return [];
    const pipeline = pipelines.data?.find((p) => p.id === filters.pipelineId);
    return (
      pipeline?.stages.map((stage) => ({
        value: stage.id,
        label: stage.name,
        color: stage.color,
      })) ?? []
    );
  }, [filters.pipelineId, pipelines.data]);

  const setFilterOpen = (id: FilterFieldId) => (open: boolean) => {
    setOpenFilter(open ? id : null);
  };

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) setOpenFilter(null);
      }}
    >
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
          <AppIcons.filter className="size-3.5" />
          Filters
          {activeCount > 0 ? (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter leads</SheetTitle>
          <SheetDescription>
            Narrow the list using server-side filters.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3.5 px-4 pb-6">
          <FilterSelect
            label="Status"
            placeholder="All statuses"
            value={filters.status}
            open={openFilter === "status"}
            onOpenChange={setFilterOpen("status")}
            options={LEAD_STATUS_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            onChange={(status) =>
              onFiltersChange({
                status: status as LeadsTableFilters["status"] | undefined,
              })
            }
          />

          <FilterSelect
            label="Pipeline"
            placeholder="All pipelines"
            value={filters.pipelineId}
            open={openFilter === "pipeline"}
            onOpenChange={setFilterOpen("pipeline")}
            disabled={pipelines.isLoading}
            options={
              pipelines.data?.map((p) => ({
                value: p.id,
                label: p.name,
              })) ?? []
            }
            onChange={(pipelineId) =>
              onFiltersChange({ pipelineId, stageId: undefined })
            }
          />

          <FilterSelect
            label="Stage"
            placeholder={
              filters.pipelineId ? "All stages" : "Select a pipeline first"
            }
            value={filters.stageId}
            open={openFilter === "stage"}
            onOpenChange={setFilterOpen("stage")}
            disabled={!filters.pipelineId || stageOptions.length === 0}
            options={stageOptions}
            showColorDot
            onChange={(stageId) => onFiltersChange({ stageId })}
          />

          <FilterSelect
            label="Source"
            placeholder="All sources"
            value={filters.sourceId}
            open={openFilter === "source"}
            onOpenChange={setFilterOpen("source")}
            disabled={sources.isLoading}
            options={
              sources.data?.map((s) => ({ value: s.id, label: s.name })) ?? []
            }
            onChange={(sourceId) => onFiltersChange({ sourceId })}
          />

          {leadScope !== "own" ? (
          <FilterSelect
            label="Assigned agent"
            placeholder="Anyone"
            value={filters.assignedUserId}
            open={openFilter === "assignee"}
            onOpenChange={setFilterOpen("assignee")}
            disabled={users.isLoading}
            options={
              users.data?.map((u) => ({ value: u.id, label: u.name })) ?? []
            }
            onChange={(assignedUserId) => onFiltersChange({ assignedUserId })}
          />
          ) : null}

          <FilterSelect
            label="Project interest"
            placeholder="All projects"
            value={filters.projectId}
            open={openFilter === "project"}
            onOpenChange={setFilterOpen("project")}
            disabled={projects.isLoading}
            options={
              projects.data?.map((p) => ({ value: p.id, label: p.name })) ?? []
            }
            onChange={(projectId) => onFiltersChange({ projectId })}
          />
        </div>
        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}
