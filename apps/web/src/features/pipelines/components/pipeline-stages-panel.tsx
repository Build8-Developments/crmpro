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
import { formatNumber } from "@/lib/format";
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
  const leadTotal = formatPipelineLeadTotal(stages);

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col bg-background", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {pipeline.name}
            </h2>
            {pipeline.isDefault ? (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Default
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {stages.length} stages · {formatNumber(leadTotal)} leads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-8" asChild>
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

      <div className="border-b border-border/40 px-4 py-3">
        <PipelineFlowStrip stages={stages} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <SortablePipelineStages pipeline={pipeline} />
      </div>
    </div>
  );
}

function formatPipelineLeadTotal(stages: PipelineStage[]): number {
  return stages.reduce((sum, stage) => sum + (stage.leadCount ?? 0), 0);
}

function PipelineFlowStrip({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {stages.map((stage, index) => {
        const styles = getStageColorStyles(stage.color);
        const terminal = isTerminalSystemStage(stage);
        return (
          <div key={stage.id} className="flex shrink-0 items-center">
            {index > 0 ? (
              <span className="mx-1.5 h-px w-3 bg-border" aria-hidden />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px]",
                terminal ? "font-medium text-foreground" : "text-muted-foreground",
              )}
              title={
                stage.leadCount > 0
                  ? `${stage.name} · ${stage.leadCount} leads`
                  : stage.name
              }
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: styles.backgroundColor }}
                aria-hidden
              />
              <span className="max-w-[6.5rem] truncate">{stage.name}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
