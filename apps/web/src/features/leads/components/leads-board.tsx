"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  STAGE_ICON_GLYPHS,
  stageIconKey,
  stageTint,
} from "@/components/crm/stage-visuals";
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
import { DEAL_STATUS_LABELS, formatMoney } from "@/features/deals/utils/deal-format";
import { useLeadFilterOptions, useLeads } from "@/features/leads/hooks";
import { useMoveLeadStage } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { Lead, LeadsListParams } from "@/features/leads/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HeatBadge, NextStepLabel } from "./workflow-visuals";

const PAGE_SIZE = 20;

/** Drop on the column under the pointer (keyboard drags fall back to overlap). */
const collision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : rectIntersection(args);
};
const MAX_COLUMN_SIZE = 100;

type BoardStage = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isClosed: boolean;
  closeType: "WON" | "LOST" | null;
};

/** Moves shown before the server confirms them, keyed by lead id. */
type PendingMoves = Record<string, { stageId: string; lead: Lead }>;

/**
 * Kanban of the leads list: one column per stage, each paging its own leads
 * through the normal leads API (same filters and visibility as the table).
 * Drag a card to move it; Lost asks for a reason first.
 */
export function LeadsBoard({ filters }: { filters: Omit<LeadsListParams, "page" | "limit"> }) {
  const { pipelines } = useLeadFilterOptions();
  const { can } = usePermissions();
  const canMove = can("lead.update");
  const moveStage = useMoveLeadStage();
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);

  const options = useMemo(() => pipelines.data ?? [], [pipelines.data]);
  const [chosenPipelineId, setChosenPipelineId] = useState<string | undefined>();
  const pipeline =
    options.find((item) => item.id === (filters.pipelineId ?? chosenPipelineId)) ??
    options.find((item) => item.isDefault) ??
    options[0];

  const stageFilter = filters.stageIds?.length
    ? new Set(filters.stageIds)
    : filters.stageId
      ? new Set([filters.stageId])
      : null;
  const stages: BoardStage[] = useMemo(
    () =>
      [...(pipeline?.stages ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((stage) => ({ ...stage, icon: stage.icon ?? null, closeType: stage.closeType ?? null })),
    [pipeline],
  );
  const visible = stageFilter ? stages.filter((stage) => stageFilter.has(stage.id)) : stages;

  const [pending, setPending] = useState<PendingMoves>({});
  const [dragged, setDragged] = useState<Lead | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (event: DragStartEvent) =>
    setDragged((event.active.data.current?.lead as Lead | undefined) ?? null);

  const onDragEnd = async (event: DragEndEvent) => {
    setDragged(null);
    const lead = event.active.data.current?.lead as Lead | undefined;
    const target = stages.find((stage) => stage.id === event.over?.id);
    if (!lead || !target || !pipeline) return;
    const current = pending[lead.id]?.stageId ?? lead.stage.id;
    if (target.id === current) return;

    // Closing a lead is never one stray drag: Won and Lost go through the
    // move dialog (pre-set to that stage; Lost also asks for the reason).
    if (target.isClosed) {
      openMoveStageDialog([lead.id], pipeline.id, undefined, target.id);
      return;
    }

    setPending((previous) => ({ ...previous, [lead.id]: { stageId: target.id, lead } }));
    try {
      await moveStage.mutateAsync({ leadId: lead.id, pipelineStageId: target.id });
    } catch {
      // Toast from the mutation; the card snaps back below.
    } finally {
      setPending((previous) => {
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
          <Skeleton key={index} className="h-96 w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }
  if (!pipeline) return null;

  const columnBase = { ...filters, pipelineId: pipeline.id, stageIds: undefined, stageId: undefined };

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {options.length > 1 && !filters.pipelineId ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pipeline</span>
          <Select value={pipeline.id} onValueChange={setChosenPipelineId}>
            <SelectTrigger className="h-8 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((item) => (
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
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={(event) => void onDragEnd(event)}
        onDragCancel={() => setDragged(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visible.map((stage) => (
            <BoardColumn
              key={stage.id}
              stage={stage}
              params={columnBase}
              pending={pending}
              canMove={canMove}
              collapsible={stage.isClosed}
            />
          ))}
        </div>
        <DragOverlay>{dragged ? <LeadCard lead={dragged} lifted /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardColumn({
  stage,
  params,
  pending,
  canMove,
  collapsible,
}: {
  stage: BoardStage;
  params: Omit<LeadsListParams, "page" | "limit">;
  pending: PendingMoves;
  canMove: boolean;
  collapsible: boolean;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [collapsed, setCollapsed] = useState(collapsible);
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const { data, isLoading } = useLeads({
    ...params,
    stageIds: [stage.id],
    page: 1,
    limit,
    sortBy: params.sortBy ?? "updatedAt",
    sortOrder: params.sortOrder ?? "desc",
  });

  const fetched = (data?.items ?? []).filter(
    (lead) => (pending[lead.id]?.stageId ?? lead.stage.id) === stage.id,
  );
  const incoming = Object.values(pending)
    .filter((move) => move.stageId === stage.id && !fetched.some((lead) => lead.id === move.lead.id))
    .map((move) => move.lead);
  const outgoing = Object.values(pending).filter(
    (move) => move.lead.stage.id === stage.id && move.stageId !== stage.id,
  ).length;
  const leads = [...incoming, ...fetched];
  const total = (data?.pagination.totalItems ?? 0) + incoming.length - outgoing;
  const tint = stageTint(stage.color);
  const Icon = STAGE_ICON_GLYPHS[stageIconKey(stage)];

  if (collapsed) {
    return (
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => setCollapsed(false)}
        title={`Show ${stage.name}`}
        className={cn(
          "flex w-11 shrink-0 flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 py-3 text-xs font-medium transition-colors duration-fast",
          isOver && "border-primary bg-primary/5",
        )}
      >
        <Icon className="size-4" style={{ color: tint }} />
        <span className="tabular-nums text-muted-foreground">{formatNumber(total)}</span>
        <span className="[writing-mode:vertical-rl]">{stage.name}</span>
        <IconChevronRight className="mt-auto size-3.5 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-muted/25 transition-colors duration-fast",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="h-0.5 shrink-0" style={{ backgroundColor: tint }} aria-hidden />
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="size-4 shrink-0" style={{ color: tint }} />
        <span className="truncate text-sm font-semibold">{stage.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{formatNumber(total)}</span>
        {collapsible ? (
          <Button
            size="icon-sm"
            variant="ghost"
            className="ml-auto size-6"
            aria-label={`Hide ${stage.name}`}
            onClick={() => setCollapsed(true)}
          >
            <IconChevronLeft className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="flex max-h-[calc(100dvh-19rem)] min-h-28 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </>
        ) : leads.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No leads here</p>
        ) : (
          leads.map((lead) => (
            <DraggableCard key={lead.id} lead={lead} disabled={!canMove || lead.status !== "OPEN"} />
          ))
        )}
        {(data?.pagination.totalItems ?? 0) > limit && limit < MAX_COLUMN_SIZE ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setLimit((value) => Math.min(value + PAGE_SIZE, MAX_COLUMN_SIZE))}
          >
            Show more
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function DraggableCard({ lead, disabled }: { lead: Lead; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
    disabled,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <LeadCard lead={lead} />
    </div>
  );
}

function LeadCard({ lead, lifted = false }: { lead: Lead; lifted?: boolean }) {
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const interest = lead.projectInterests[0];
  return (
    <button
      type="button"
      onClick={() => openDrawer(lead.id)}
      className={cn(
        "w-full rounded-lg border border-border/70 bg-card p-2.5 text-start shadow-xs transition-shadow duration-fast hover:shadow-sm",
        lifted && "rotate-1 shadow-lg",
        lead.status !== "OPEN" && "opacity-60",
      )}
    >
      <span className="flex items-center gap-1.5">
        <span className="truncate text-sm font-medium">{lead.fullName}</span>
        {lead.stage.isClosed ? null : <HeatBadge heat={lead.heat} compact className="size-4" />}
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
        {lead.primaryPhone}
        {interest ? ` · ${interest.project.name}` : ""}
      </span>
      {lead.liveDeal ? (
        <span className="mt-1 flex items-center gap-1 truncate text-[11px] font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
          <AppIcons.deals className="size-3 shrink-0" />
          {formatMoney(lead.liveDeal.price, lead.liveDeal.currency, { compact: true })}
          <span className="truncate font-normal text-muted-foreground">
            · {DEAL_STATUS_LABELS[lead.liveDeal.status]}
          </span>
        </span>
      ) : null}
      <span className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-muted-foreground">{lead.assignee?.name ?? "Unassigned"}</span>
        <NextStepLabel
          nextTaskDueAt={lead.nextTaskDueAt}
          isClosed={lead.stage.isClosed || lead.status !== "OPEN"}
          className="shrink-0"
        />
      </span>
    </button>
  );
}
