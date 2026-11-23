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
import { PipelineBoard } from "@/features/pipelines/components/pipeline-board";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
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

  const stages = pipeline.stages;
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

      <PipelineBoard pipeline={pipeline} />
    </div>
  );
}

function formatPipelineLeadTotal(stages: PipelineStage[]): number {
  return stages.reduce((sum, stage) => sum + (stage.leadCount ?? 0), 0);
}
