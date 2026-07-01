"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Pipeline, PipelineStage } from "@/features/pipelines/types";
import { SortablePipelineStages } from "@/features/pipelines/components/sortable-pipeline-stages";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import {
  isTerminalSystemStage,
  sortStages,
} from "@/features/pipelines/utils/pipeline-stage";
import { getStageColorStyles } from "@/features/leads/utils/stage-color";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface PipelineStagesPanelProps {
  pipeline: Pipeline;
  className?: string;
}

export function PipelineStagesPanel({
  pipeline,
  className,
}: PipelineStagesPanelProps) {
  const openEditPipeline = usePipelineUiStore((s) => s.openEditPipeline);
  const openDeletePipeline = usePipelineUiStore((s) => s.openDeletePipeline);
  const openCreateStage = usePipelineUiStore((s) => s.openCreateStage);
  const { can } = usePermissions();

  const stages = sortStages(pipeline.stages);

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{pipeline.name}</h2>
          <p className="text-xs text-muted-foreground">
            {stages.length} stages · {formatPipelineLeadTotal(stages)} leads
            {pipeline.isDefault ? " · default" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-8" asChild>
            <Link href={`/leads?pipelineId=${pipeline.id}`}>
              <AppIcons.leads className="size-3.5" />
              Leads
            </Link>
          </Button>
          {can("pipeline.update") ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => openEditPipeline(pipeline.id)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8"
                onClick={() => openCreateStage(pipeline.id)}
              >
                <AppIcons.create className="size-3.5" />
                Stage
              </Button>
            </>
          ) : null}
          {can("pipeline.delete") && !pipeline.isDefault ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-8"
                  aria-label="More pipeline actions"
                >
                  <AppIcons.moreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => openDeletePipeline(pipeline.id)}
                >
                  Delete pipeline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="border-b border-border/40 bg-muted/15 px-4 py-2.5">
        <PipelineFlowStrip stages={stages} />
      </div>

      <SortablePipelineStages pipeline={pipeline} />
    </div>
  );
}

function formatPipelineLeadTotal(stages: PipelineStage[]): number {
  return stages.reduce((sum, stage) => sum + (stage.leadCount ?? 0), 0);
}

function PipelineFlowStrip({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage, index) => {
        const styles = getStageColorStyles(stage.color);
        const terminal = isTerminalSystemStage(stage);
        return (
          <div key={stage.id} className="flex shrink-0 items-center gap-1">
            {index > 0 ? (
              <AppIcons.chevronRight
                className="size-3 shrink-0 text-muted-foreground/50"
                stroke={2}
              />
            ) : null}
            <span
              className={cn(
                "inline-flex h-6 max-w-[7.5rem] items-center truncate rounded-md px-2 text-[11px] font-medium",
                terminal && "ring-1 ring-border/50 ring-inset",
              )}
              style={{
                backgroundColor: styles.backgroundColor,
                color: styles.color,
              }}
              title={
                stage.leadCount > 0
                  ? `${stage.name} · ${stage.leadCount} leads`
                  : stage.name
              }
            >
              {stage.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
