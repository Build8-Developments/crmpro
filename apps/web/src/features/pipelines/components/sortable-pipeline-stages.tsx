"use client";

import { useEffect, useMemo, useState } from "react";
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Pipeline, PipelineStage } from "@/features/pipelines/types";
import { useReorderPipelineStage } from "@/features/pipelines/mutations";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import {
  canDragStage,
  getDraggableStages,
  isTerminalSystemStage,
  sortStages,
} from "@/features/pipelines/utils/pipeline-stage";
import { getStageColorStyles } from "@/features/leads/utils/stage-color";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface SortablePipelineStagesProps {
  pipeline: Pipeline;
}

export function SortablePipelineStages({ pipeline }: SortablePipelineStagesProps) {
  const { can } = usePermissions();
  const canReorder = can("pipeline.update");
  const updateStage = useReorderPipelineStage();

  const draggableStages = useMemo(
    () => getDraggableStages(pipeline.stages),
    [pipeline.stages],
  );
  const closedStages = useMemo(
    () => sortStages(pipeline.stages).filter((stage) => stage.isClosed),
    [pipeline.stages],
  );

  const [items, setItems] = useState(draggableStages);

  useEffect(() => {
    setItems(draggableStages);
  }, [draggableStages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((stage) => stage.id === active.id);
    const newIndex = items.findIndex((stage) => stage.id === over.id);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const movedStage = items[oldIndex];
    const targetStage = items[newIndex];
    const previousItems = items;

    setItems(arrayMove(items, oldIndex, newIndex));

    void updateStage
      .mutateAsync({
        pipelineId: pipeline.id,
        stageId: movedStage.id,
        sortOrder: targetStage.sortOrder,
      })
      .catch(() => {
        setItems(previousItems);
      });
  };

  return (
    <div className="divide-y divide-border/50">
      <StageSection
        label={
          canReorder ? "Open stages · drag to reorder" : "Open stages"
        }
      >
        {canReorder ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((stage) => stage.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  pipeline={pipeline}
                  stage={stage}
                  canReorder={canReorder}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          draggableStages.map((stage) => (
            <StageRow
              key={stage.id}
              pipeline={pipeline}
              stage={stage}
              canReorder={false}
            />
          ))
        )}
      </StageSection>

      {closedStages.length > 0 ? (
        <StageSection label="Closed">
          {closedStages.map((stage) => (
            <StageRow
              key={stage.id}
              pipeline={pipeline}
              stage={stage}
              canReorder={false}
            />
          ))}
        </StageSection>
      ) : null}
    </div>
  );
}

function StageSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="bg-muted/10 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function SortableStageRow({
  pipeline,
  stage,
  canReorder,
}: {
  pipeline: Pipeline;
  stage: PipelineStage;
  canReorder: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
    disabled: !canDragStage(stage),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StageRow
        pipeline={pipeline}
        stage={stage}
        canReorder={canReorder}
        isDragging={isDragging}
        dragHandleProps={
          canDragStage(stage) ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  );
}

function StageRow({
  pipeline,
  stage,
  canReorder,
  isDragging = false,
  dragHandleProps,
}: {
  pipeline: Pipeline;
  stage: PipelineStage;
  canReorder: boolean;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}) {
  const openEditStage = usePipelineUiStore((s) => s.openEditStage);
  const openDeleteStage = usePipelineUiStore((s) => s.openDeleteStage);
  const { can } = usePermissions();

  const styles = getStageColorStyles(stage.color);
  const terminal = isTerminalSystemStage(stage);
  const canDelete = can("pipeline.update") && !stage.isSystem;
  const canEdit = can("pipeline.update");

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/25 sm:gap-3 sm:px-4",
        terminal && "bg-muted/10",
        isDragging && "rounded-md bg-background shadow-md ring-1 ring-border/80",
      )}
    >
      {canReorder && canDragStage(stage) ? (
        <button
          type="button"
          className={cn(
            "flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground",
            "hover:bg-muted hover:text-foreground active:cursor-grabbing",
          )}
          aria-label={`Drag ${stage.name}`}
          {...dragHandleProps}
        >
          <AppIcons.grip className="size-4" stroke={1.75} />
        </button>
      ) : (
        <span className="w-7 shrink-0" aria-hidden />
      )}

      <span
        className="w-5 shrink-0 text-center text-[10px] font-medium tabular-nums text-muted-foreground"
        aria-hidden
      >
        {stage.sortOrder}
      </span>

      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: styles.backgroundColor }}
        aria-hidden
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{stage.name}</span>
          {(stage.leadCount ?? 0) > 0 ? (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">
              {stage.leadCount}
            </Badge>
          ) : null}
          {stage.closeType === "WON" ? (
            <span className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              Won
            </span>
          ) : null}
          {stage.closeType === "LOST" ? (
            <span className="shrink-0 text-[10px] font-medium text-red-600 dark:text-red-400">
              Lost
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7"
          asChild
          title="View leads"
        >
          <Link
            href={`/leads?pipelineId=${pipeline.id}&stageId=${stage.id}`}
          >
            <AppIcons.leads className="size-3.5" />
          </Link>
        </Button>

        {canEdit ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => openEditStage(pipeline.id, stage.id)}
            >
              Edit
            </Button>
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => openDeleteStage(pipeline.id, stage.id)}
              >
                Delete
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
