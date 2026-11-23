"use client";

import { useWorkspaceCurrency } from "@/features/organization/hooks";
import { useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_CHANNEL_PREFERENCES,
  PAYMENT_PREFERENCE_LABELS,
  PAYMENT_PREFERENCES,
  PURCHASE_PURPOSE_LABELS,
  PURCHASE_PURPOSES,
} from "@crmpro/shared";
import { useLeadFilterOptions, useLostReasons } from "@/features/leads/hooks";
import type { LeadsTableFilters } from "@/features/leads/stores/leads-table-store";
import {
  createdBoundDay,
  HEAT_OPTIONS,
  INTEREST_LEVEL_OPTIONS,
  LAST_CONTACT_OPTIONS,
  LEAD_STATUS_OPTIONS,
  NEXT_STEP_OPTIONS,
  UNANSWERED_OPTIONS,
} from "@/features/leads/utils/lead-filters";
import { FilterChips, FilterMultiSelect, FilterSelect } from "./filter-select";

interface LeadsFiltersSheetProps {
  filters: LeadsTableFilters;
  onFiltersChange: (filters: Partial<LeadsTableFilters>) => void;
  onClearFilters: () => void;
  activeCount: number;
}

type FilterFieldId =
  | "status"
  | "pipeline"
  | "stages"
  | "sources"
  | "assignees"
  | "project"
  | "interest"
  | "lastContact"
  | "unanswered"
  | "lostReason";

const UNASSIGNED = "unassigned";

function parseAmount(value: string): number | undefined {
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return undefined;
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount : undefined;
}

export function LeadsFiltersSheet({
  filters,
  onFiltersChange,
  onClearFilters,
  activeCount,
}: LeadsFiltersSheetProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<FilterFieldId | null>(null);

  const { pipelines, sources, users, projects } = useLeadFilterOptions();
  const lostReasons = useLostReasons();
  const currency = useWorkspaceCurrency();

  const stageOptions = useMemo(() => {
    const list = pipelines.data ?? [];
    const scoped = filters.pipelineId
      ? list.filter((pipeline) => pipeline.id === filters.pipelineId)
      : list;
    return scoped.flatMap((pipeline) =>
      pipeline.stages.map((stage) => ({
        value: stage.id,
        label: scoped.length > 1 ? `${stage.name} · ${pipeline.name}` : stage.name,
        color: stage.color,
      })),
    );
  }, [filters.pipelineId, pipelines.data]);

  const assigneeOptions = useMemo(
    () => [
      { value: UNASSIGNED, label: "Unassigned" },
      ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
    ],
    [users.data],
  );

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
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter leads</SheetTitle>
          <SheetDescription>
            Combine filters, then select all matching leads to assign or move them.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <FilterSection title="Ownership">
            <FilterMultiSelect
              label="Assigned to"
              placeholder="Anyone"
              values={filters.assignees ?? []}
              open={openFilter === "assignees"}
              onOpenChange={setFilterOpen("assignees")}
              disabled={users.isLoading}
              options={assigneeOptions}
              onChange={(assignees) =>
                onFiltersChange({ assignees, assignedUserId: undefined, unassignedOnly: undefined })
              }
            />
          </FilterSection>

          <FilterSection title="Follow-up">
            <FilterChips
              label="Next step"
              options={NEXT_STEP_OPTIONS}
              values={filters.nextStep ? [filters.nextStep] : []}
              onChange={([nextStep]) => onFiltersChange({ nextStep })}
            />
            <FilterChips
              label="Heat"
              multiple
              options={HEAT_OPTIONS}
              values={filters.heat ?? []}
              onChange={(heat) => onFiltersChange({ heat })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect
                label="Last contact"
                placeholder="Any time"
                value={filters.lastContact}
                open={openFilter === "lastContact"}
                onOpenChange={setFilterOpen("lastContact")}
                options={LAST_CONTACT_OPTIONS}
                onChange={(lastContact) =>
                  onFiltersChange({
                    lastContact: lastContact as LeadsTableFilters["lastContact"],
                    staleOnly: undefined,
                  })
                }
              />
              <FilterSelect
                label="Unanswered"
                placeholder="Any"
                value={filters.unansweredMin ? String(filters.unansweredMin) : undefined}
                open={openFilter === "unanswered"}
                onOpenChange={setFilterOpen("unanswered")}
                options={UNANSWERED_OPTIONS}
                onChange={(value) =>
                  onFiltersChange({ unansweredMin: value ? Number(value) : undefined })
                }
              />
            </div>
          </FilterSection>

          <FilterSection title="Pipeline">
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect
                label="Pipeline"
                placeholder="All pipelines"
                value={filters.pipelineId}
                open={openFilter === "pipeline"}
                onOpenChange={setFilterOpen("pipeline")}
                disabled={pipelines.isLoading}
                options={pipelines.data?.map((p) => ({ value: p.id, label: p.name })) ?? []}
                onChange={(pipelineId) =>
                  onFiltersChange({ pipelineId, stageId: undefined, stageIds: undefined })
                }
              />
              <FilterSelect
                label="Status"
                placeholder="Open & archived"
                value={filters.status}
                open={openFilter === "status"}
                onOpenChange={setFilterOpen("status")}
                options={LEAD_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(status) =>
                  onFiltersChange({ status: status as LeadsTableFilters["status"] | undefined })
                }
              />
            </div>
            <FilterMultiSelect
              label="Stages"
              placeholder="All stages"
              values={filters.stageIds ?? (filters.stageId ? [filters.stageId] : [])}
              open={openFilter === "stages"}
              onOpenChange={setFilterOpen("stages")}
              disabled={stageOptions.length === 0}
              options={stageOptions}
              showColorDot
              onChange={(stageIds) => onFiltersChange({ stageIds, stageId: undefined })}
            />
            <FilterSelect
              label="Lost reason"
              placeholder="Any reason"
              value={filters.lostReasonId}
              open={openFilter === "lostReason"}
              onOpenChange={setFilterOpen("lostReason")}
              disabled={lostReasons.isLoading}
              options={(lostReasons.data ?? []).map((r) => ({ value: r.id, label: r.name }))}
              onChange={(lostReasonId) => onFiltersChange({ lostReasonId })}
            />
          </FilterSection>

          <FilterSection title="Client profile">
            <FilterChips
              label="Buying to"
              multiple
              options={PURCHASE_PURPOSES.map((value) => ({ value, label: PURCHASE_PURPOSE_LABELS[value] }))}
              values={filters.purchasePurposes ?? []}
              onChange={(purchasePurposes) => onFiltersChange({ purchasePurposes })}
            />
            <FilterChips
              label="Pays by"
              multiple
              options={PAYMENT_PREFERENCES.map((value) => ({ value, label: PAYMENT_PREFERENCE_LABELS[value] }))}
              values={filters.paymentPreferences ?? []}
              onChange={(paymentPreferences) => onFiltersChange({ paymentPreferences })}
            />
            <FilterChips
              label="Prefers to be reached by"
              multiple
              options={CONTACT_CHANNEL_PREFERENCES.map((value) => ({
                value,
                label: CONTACT_CHANNEL_LABELS[value],
              }))}
              values={filters.contactChannelPreferences ?? []}
              onChange={(contactChannelPreferences) => onFiltersChange({ contactChannelPreferences })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Lives in
                </p>
                <Input
                  placeholder="e.g. Nasr City"
                  className="h-8 text-xs"
                  value={filters.residenceArea ?? ""}
                  onChange={(event) =>
                    onFiltersChange({ residenceArea: event.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Job
                </p>
                <Input
                  placeholder="e.g. Doctor"
                  className="h-8 text-xs"
                  value={filters.occupation ?? ""}
                  onChange={(event) => onFiltersChange({ occupation: event.target.value || undefined })}
                />
              </div>
            </div>
          </FilterSection>

          <FilterSection title="Lead">
            <FilterMultiSelect
              label="Source"
              placeholder="All sources"
              values={filters.sourceIds ?? (filters.sourceId ? [filters.sourceId] : [])}
              open={openFilter === "sources"}
              onOpenChange={setFilterOpen("sources")}
              disabled={sources.isLoading}
              options={sources.data?.map((s) => ({ value: s.id, label: s.name })) ?? []}
              onChange={(sourceIds) => onFiltersChange({ sourceIds, sourceId: undefined })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FilterSelect
                label="Project interest"
                placeholder="Any project"
                value={filters.projectId}
                open={openFilter === "project"}
                onOpenChange={setFilterOpen("project")}
                disabled={projects.isLoading}
                options={projects.data?.map((p) => ({ value: p.id, label: p.name })) ?? []}
                onChange={(projectId) => onFiltersChange({ projectId })}
              />
              <FilterSelect
                label="Interest level"
                placeholder="Any level"
                value={filters.interestLevel}
                open={openFilter === "interest"}
                onOpenChange={setFilterOpen("interest")}
                options={INTEREST_LEVEL_OPTIONS}
                onChange={(level) =>
                  onFiltersChange({
                    interestLevel: level as LeadsTableFilters["interestLevel"],
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Budget ({currency})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  inputMode="numeric"
                  placeholder="Min"
                  className="h-8 text-xs"
                  value={filters.budgetMin ?? ""}
                  onChange={(event) => onFiltersChange({ budgetMin: parseAmount(event.target.value) })}
                />
                <Input
                  inputMode="numeric"
                  placeholder="Max"
                  className="h-8 text-xs"
                  value={filters.budgetMax ?? ""}
                  onChange={(event) => onFiltersChange({ budgetMax: parseAmount(event.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Created
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  aria-label="Created from"
                  className="h-8 text-xs"
                  value={createdBoundDay(filters.createdFrom)}
                  onChange={(event) => onFiltersChange({ createdFrom: event.target.value || undefined })}
                />
                <Input
                  type="date"
                  aria-label="Created to"
                  className="h-8 text-xs"
                  value={createdBoundDay(filters.createdTo)}
                  onChange={(event) => onFiltersChange({ createdTo: event.target.value || undefined })}
                />
              </div>
            </div>
          </FilterSection>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={activeCount === 0}
            onClick={onClearFilters}
          >
            Clear all
          </Button>
          <Button type="button" size="sm" onClick={() => setSheetOpen(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}
