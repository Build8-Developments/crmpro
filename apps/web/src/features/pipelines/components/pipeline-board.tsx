"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconChevronRight, IconDotsVertical, IconGripVertical, IconPlus } from "@tabler/icons-react";
import { StageIconTile, stageTint } from "@/components/crm/stage-visuals";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppIcons } from "@/components/icons/app-icons";
import { useReorderPipelineStage } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import type { Pipeline, PipelineStage } from "@/features/pipelines/types";
import { canDragStage, getDraggableStages, sortStages } from "@/features/pipelines/utils/pipeline-stage";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Fixed node height so the outcome fork can line up with node centers. */
const NODE_HEIGHT = 124;

/**
 * Stages as a flow chart: open stages left to right in the order leads move
 * through them (drag to reorder), joined by arrows, then a fork into the Won /
 * Lost outcomes. Each node shows its icon, color and how many leads sit there.
 */
export function PipelineBoard({ pipeline }: { pipeline: Pipeline }) {
  const { can } = usePermissions();
  const canEdit = can("pipeline.update");
  const reorder = useReorderPipelineStage();
  const openCreateStage = usePipelineUiStore((s) => s.openCreateStage);

  const openStages = useMemo(() => getDraggableStages(pipeline.stages), [pipeline.stages]);
  const outcomes = useMemo(
    () => sortStages(pipeline.stages).filter((stage) => stage.isClosed),
    [pipeline.stages],
  );
  const total = pipeline.stages.reduce((sum, stage) => sum + (stage.leadCount ?? 0), 0);

  // Optimistic order while a reorder is saving.
  const [items, setItems] = useState(openStages);
  const [signature, setSignature] = useState("");
  const nextSignature = openStages.map((stage) => `${stage.id}:${stage.sortOrder}`).join("|");
  if (nextSignature !== signature) {
    setSignature(nextSignature);
    setItems(openStages);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((stage) => stage.id === active.id);
    const to = items.findIndex((stage) => stage.id === over.id);
    if (from < 0 || to < 0) return;
    const previous = items;
    setItems(arrayMove(items, from, to));
    void reorder
      .mutateAsync({ pipelineId: pipeline.id, stageId: items[from].id, sortOrder: items[to].sortOrder })
      .catch(() => setItems(previous));
  };

  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex min-w-max items-center px-5 py-8">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((stage) => stage.id)} strategy={horizontalListSortingStrategy}>
            {items.map((stage, index) => (
              <SortableStageNode
                key={stage.id}
                pipeline={pipeline}
                stage={stage}
                position={index + 1}
                total={total}
                draggable={canEdit && canDragStage(stage)}
                connector={index < items.length - 1}
              />
            ))}
          </SortableContext>
        </DndContext>

        {canEdit || outcomes.length > 0 ? (
          <div className="flex shrink-0 items-center" aria-hidden={!canEdit}>
            <span className="h-px w-5 bg-border" />
            {canEdit ? (
              <button
                type="button"
                onClick={() => openCreateStage(pipeline.id)}
                title="Add stage"
                aria-label="Add stage"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed bg-card text-muted-foreground transition-colors duration-fast ease-enter hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              >
                <IconPlus className="size-4" />
              </button>
            ) : null}
            {outcomes.length > 0 ? <span className="h-px w-5 bg-border" /> : null}
          </div>
        ) : null}

        {outcomes.length > 0 ? (
          <div className="relative flex shrink-0 flex-col gap-4 pl-8">
            {/* The fork: one line in, one branch per outcome. */}
            {outcomes.length > 1 ? (
              <span
                aria-hidden
                className="absolute left-0 w-px bg-border"
                style={{ top: NODE_HEIGHT / 2, bottom: NODE_HEIGHT / 2 }}
              />
            ) : null}
            {outcomes.map((stage) => (
              <div key={stage.id} className="relative">
                <span aria-hidden className="absolute top-1/2 -left-8 h-px w-8 bg-border" />
                <IconChevronRight
                  aria-hidden
                  className="absolute top-1/2 -left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/70"
                />
                <StageNode pipeline={pipeline} stage={stage} total={total} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SortableStageNode({
  pipeline,
  stage,
  position,
  total,
  draggable,
  connector,
}: {
  pipeline: Pipeline;
  stage: PipelineStage;
  position: number;
  total: number;
  draggable: boolean;
  connector: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className="flex shrink-0 items-center"
    >
      <StageNode
        pipeline={pipeline}
        stage={stage}
        total={total}
        position={position}
        isDragging={isDragging}
        dragHandle={draggable ? { ...attributes, ...listeners } : undefined}
      />
      {connector ? <FlowArrow /> : null}
    </div>
  );
}

/** A connector between two nodes: a line ending in an arrow head. */
function FlowArrow() {
  return (
    <span aria-hidden className="relative flex w-10 shrink-0 items-center">
      <span className="h-px flex-1 bg-border" />
      <IconChevronRight className="-ml-2 size-3.5 text-muted-foreground/70" />
    </span>
  );
}

function StageNode({
  pipeline,
  stage,
  total,
  position,
  isDragging = false,
  dragHandle,
}: {
  pipeline: Pipeline;
  stage: PipelineStage;
  total: number;
  position?: number;
  isDragging?: boolean;
  dragHandle?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const openEditStage = usePipelineUiStore((s) => s.openEditStage);
  const openDeleteStage = usePipelineUiStore((s) => s.openDeleteStage);
  const { can } = usePermissions();
  const canEdit = can("pipeline.update");
  const tint = stageTint(stage.color);
  const share = total > 0 ? Math.round(((stage.leadCount ?? 0) / total) * 100) : 0;
  const leadsHref = `/leads?pipelineId=${pipeline.id}&stageIds=${stage.id}`;

  const count = stage.leadCount ?? 0;
  const outcomeLabel =
    stage.closeType === "WON" ? "Won" : stage.closeType === "LOST" ? "Lost" : null;

  return (
    <div
      style={{ height: NODE_HEIGHT }}
      className={cn(
        "group relative flex w-56 flex-col rounded-2xl border bg-card shadow-xs transition-shadow duration-base ease-enter",
        isDragging && "shadow-lg ring-1 ring-border",
        stage.isClosed && "border-dashed",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-1 rounded-r-full"
        style={{ backgroundColor: tint }}
      />
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <StageIconTile stage={stage} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={stage.name}>
            {stage.name}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {outcomeLabel ? `${outcomeLabel} outcome` : `Step ${position}`}
          </p>
        </div>
        {dragHandle ? (
          <button
            type="button"
            aria-label={`Drag ${stage.name}`}
            className="-mr-1 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-fast group-hover:opacity-100 hover:bg-muted active:cursor-grabbing focus-visible:opacity-100"
            {...dragHandle}
          >
            <IconGripVertical className="size-4" />
          </button>
        ) : null}
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="-mr-1.5 size-7" aria-label={`${stage.name} actions`}>
                <IconDotsVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => openEditStage(pipeline.id, stage.id)}>
                <AppIcons.edit className="size-4" />
                Edit stage
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={leadsHref}>
                  <AppIcons.leads className="size-4" />
                  View leads
                </Link>
              </DropdownMenuItem>
              {!stage.isSystem ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => openDeleteStage(pipeline.id, stage.id)}>
                    <AppIcons.trash className="size-4" />
                    Delete stage
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Link
        href={leadsHref}
        title={`View ${formatNumber(count)} leads in ${stage.name}`}
        className="mx-1.5 mt-auto mb-1.5 flex flex-col gap-1.5 rounded-xl px-2 py-2 transition-colors duration-fast ease-enter hover:bg-muted/50"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("text-xl font-semibold tabular-nums", count === 0 && "text-muted-foreground")}>
            {formatNumber(count)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">leads</span>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">{share}%</span>
        </span>
        <span className="h-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full transition-[width] duration-slow ease-smooth"
            style={{ width: `${Math.max(share, count ? 2 : 0)}%`, backgroundColor: tint }}
          />
        </span>
      </Link>
    </div>
  );
}
