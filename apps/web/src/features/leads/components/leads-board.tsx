"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { moveLeadStage } from "@/features/leads/api";
import { useLeadFilterOptions, useLeads } from "@/features/leads/hooks";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { Lead, LeadsListParams } from "@/features/leads/types";
import { getStageColorStyles } from "@/features/leads/utils/stage-color";
import { formatDueDate, isPastDue } from "@/features/tasks/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/query-keys";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

type PendingMoves = Record<string, { stageId: string; lead: Lead }>;
const MAX_COLUMN_SIZE = 100;

interface BoardStage {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  isClosed: boolean;
}

interface LeadsBoardProps {
  /** Active list filters (search, source, assignee…) — pipeline/stage come from the board. */
  baseParams: LeadsListParams;
}

/**
 * Kanban view: one column per stage, each paging its own leads through the
 * normal (scoped) leads API. Drag a card to move its stage; the move is shown
 * immediately and rolled back if the API refuses it.
 */
export function LeadsBoard({ baseParams }: LeadsBoardProps) {
  const t = useTranslations("leads.view");
  const { pipelines } = useLeadFilterOptions();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canMove = can("lead.update");

  const pipelineOptions = useMemo(() => pipelines.data ?? [], [pipelines.data]);
  const [chosenPipelineId, setChosenPipelineId] = useState<string | undefined>(
    baseParams.pipelineId,
  );
  const pipeline =
    pipelineOptions.find((item) => item.id === chosenPipelineId) ??
    pipelineOptions.find((item) => item.isDefault) ??
    pipelineOptions[0];

  const stages: BoardStage[] = useMemo(
    () => [...(pipeline?.stages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [pipeline],
  );
  const openStages = stages.filter((stage) => !stage.isClosed);
  const closedStages = stages.filter((stage) => stage.isClosed);

  // Moves not yet confirmed by a refetch, keyed by lead id.
  const [pendingMoves, setPendingMoves] = useState<PendingMoves>({});
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLead((event.active.data.current?.lead as Lead | undefined) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const lead = event.active.data.current?.lead as Lead | undefined;
    const targetStageId = event.over?.id as string | undefined;
    const currentStageId = lead
      ? (pendingMoves[lead.id]?.stageId ?? lead.stage.id)
      : undefined;

    if (!lead || !targetStageId || targetStageId === currentStageId) return;

    setPendingMoves((previous) => ({
      ...previous,
      [lead.id]: { stageId: targetStageId, lead },
    }));

    try {
      await moveLeadStage(lead.id, targetStageId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.leads.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() }),
      ]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not move lead");
    } finally {
      setPendingMoves((previous) => {
        const next = { ...previous };
        delete next[lead.id];
        return next;
      });
    }
  };

  if (pipelines.isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden p-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-80 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  if (!pipeline) return null;

  const columnParams: Omit<LeadsListParams, "stageId"> = {
    ...baseParams,
    pipelineId: pipeline.id,
    page: 1,
  };

  return (
    <div className="space-y-3 p-4">
      {pipelineOptions.length > 1 ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("pickPipeline")}</span>
          <Select value={pipeline.id} onValueChange={setChosenPipelineId}>
            <SelectTrigger className="h-8 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pipelineOptions.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {openStages.map((stage) => (
            <BoardColumn
              key={stage.id}
              stage={stage}
              params={columnParams}
              pendingMoves={pendingMoves}
              canMove={canMove}
            />
          ))}
          {closedStages.map((stage) => (
            <BoardColumn
              key={stage.id}
              stage={stage}
              params={columnParams}
              pendingMoves={pendingMoves}
              canMove={canMove}
              collapsible
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardColumn({
  stage,
  params,
  pendingMoves,
  canMove,
  collapsible = false,
}: {
  stage: BoardStage;
  params: Omit<LeadsListParams, "stageId">;
  pendingMoves: PendingMoves;
  canMove: boolean;
  collapsible?: boolean;
}) {
  const t = useTranslations("leads.view");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [collapsed, setCollapsed] = useState(collapsible);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const { data, isLoading } = useLeads({
    ...params,
    stageId: stage.id,
    limit,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  const fetched = (data?.items ?? []).filter(
    (lead) => (pendingMoves[lead.id]?.stageId ?? lead.stage.id) === stage.id,
  );
  // Cards dragged into this column from elsewhere, shown until refetch.
  const incoming = Object.values(pendingMoves)
    .filter(
      (move) =>
        move.stageId === stage.id &&
        !fetched.some((lead) => lead.id === move.lead.id),
    )
    .map((move) => move.lead);
  const leads = [...incoming, ...fetched];
  const total = data?.pagination.totalItems ?? 0;
  const styles = getStageColorStyles(stage.color);

  if (collapsed) {
    return (
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => setCollapsed(false)}
        className={cn(
          "flex w-12 shrink-0 flex-col items-center gap-2 rounded-xl border bg-muted/20 py-3 text-xs font-medium",
          isOver && "border-primary bg-primary/5",
        )}
      >
        <span className="tabular-nums text-muted-foreground">{total}</span>
        <span className="[writing-mode:vertical-rl]" style={{ color: styles.color }}>
          {stage.name}
        </span>
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/20 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span
          className="truncate rounded-md border px-2 py-0.5 text-xs font-medium"
          style={styles}
        >
          {stage.name}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-xs tabular-nums text-muted-foreground">
            {t("count", { count: total + incoming.length })}
          </span>
          {collapsible ? (
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label={t("closedColumns")}
              onClick={() => setCollapsed(true)}
            >
              <AppIcons.close className="size-3" />
            </Button>
          ) : null}
        </span>
      </div>
      <div className="flex max-h-[calc(100vh-18rem)] min-h-24 flex-col gap-2 overflow-y-auto p-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : leads.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("empty")}</p>
        ) : (
          leads.map((lead) => (
            <DraggableLeadCard
              key={lead.id}
              lead={lead}
              disabled={!canMove || lead.status !== "OPEN"}
            />
          ))
        )}
        {total > limit && limit < MAX_COLUMN_SIZE ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setLimit((value) => Math.min(value + PAGE_SIZE, MAX_COLUMN_SIZE))}
          >
            {t("loadMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead, disabled }: { lead: Lead; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} />
    </div>
  );
}

function LeadCard({ lead, dragging = false }: { lead: Lead; dragging?: boolean }) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const overdue = isPastDue(lead.nextFollowUpAt);
  const interest = lead.projectInterests[0];

  return (
    <button
      type="button"
      onClick={() => openDrawer(lead.id)}
      className={cn(
        "w-full rounded-lg border bg-card p-2.5 text-start shadow-xs transition-shadow hover:shadow-sm",
        dragging && "rotate-1 shadow-md",
      )}
    >
      <p className="truncate text-sm font-medium">{lead.fullName}</p>
      <p className="truncate text-xs tabular-nums text-muted-foreground">
        {lead.primaryPhone}
        {interest ? ` · ${interest.project.name}` : ""}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-muted-foreground">
          {lead.assignee?.name ?? "—"}
        </span>
        {lead.nextFollowUpAt ? (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1",
              overdue ? "font-medium text-destructive" : "text-muted-foreground",
            )}
          >
            <AppIcons.clock className="size-3" />
            {formatDueDate(lead.nextFollowUpAt)}
          </span>
        ) : null}
      </div>
    </button>
  );
}
