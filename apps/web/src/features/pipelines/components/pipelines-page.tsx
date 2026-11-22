"use client";

import { useEffect, useMemo } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePipelineDialog } from "@/features/pipelines/components/create-pipeline-dialog";
import { CreateStageDialog } from "@/features/pipelines/components/create-stage-dialog";
import { DeletePipelineDialog } from "@/features/pipelines/components/delete-pipeline-dialog";
import { DeleteStageDialog } from "@/features/pipelines/components/delete-stage-dialog";
import { EditPipelineDialog } from "@/features/pipelines/components/edit-pipeline-dialog";
import { EditStageDialog } from "@/features/pipelines/components/edit-stage-dialog";
import { PipelineStagesPanel } from "@/features/pipelines/components/pipeline-stages-panel";
import { PipelinesEmptyState } from "@/features/pipelines/components/pipelines-empty-state";
import { PipelinesHeader } from "@/features/pipelines/components/pipelines-header";
import { PipelinesSkeleton } from "@/features/pipelines/components/pipelines-skeleton";
import { usePipeline, usePipelines } from "@/features/pipelines/hooks";
import { usePipelinesUrlState } from "@/features/pipelines/hooks/use-pipelines-url-state";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { cn } from "@/lib/utils";

const PIPELINES_PAGE_SIZE = 50;

export function PipelinesPage() {
  usePipelinesUrlState();

  const selectedPipelineId = usePipelineUiStore((s) => s.selectedPipelineId);
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );

  const { data, isLoading, isError, isFetching, refetch } = usePipelines({
    page: 1,
    limit: PIPELINES_PAGE_SIZE,
    sortBy: "name",
    sortOrder: "asc",
  });

  const {
    data: selectedPipelineDetail,
    isLoading: detailLoading,
  } = usePipeline(selectedPipelineId ?? undefined);

  const pipelines = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const hasSearch = false;

  const selectedPipeline =
    selectedPipelineDetail ??
    pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ??
    null;

  useEffect(() => {
    if (pipelines.length === 0) {
      if (selectedPipelineId !== null && !hasSearch) {
        setSelectedPipelineId(null);
      }
      return;
    }

    const stillExists = pipelines.some(
      (pipeline) => pipeline.id === selectedPipelineId,
    );

    if (!selectedPipelineId || !stillExists) {
      const defaultPipeline =
        pipelines.find((pipeline) => pipeline.isDefault) ?? pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId, setSelectedPipelineId, hasSearch]);

  if (isLoading && !data) {
    return <PipelinesSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <PipelinesHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load pipelines
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your pipelines. Check your connection and
              try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showEmpty =
    pipelines.length === 0 && !hasSearch && pagination?.totalItems === 0;

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <PipelinesHeader />

      {showEmpty ? (
        <PipelinesEmptyState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <PipelineTabs
            pipelines={pipelines}
            selectedPipelineId={selectedPipelineId}
            onSelect={setSelectedPipelineId}
          />
          {selectedPipeline ? (
            detailLoading && !selectedPipelineDetail ? (
              <PipelineDetailSkeleton />
            ) : (
              <PipelineStagesPanel pipeline={selectedPipeline} />
            )
          ) : (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              Select a pipeline
            </div>
          )}
        </div>
      )}

      <CreatePipelineDialog />
      <EditPipelineDialog />
      <DeletePipelineDialog />
      <CreateStageDialog />
      <EditStageDialog />
      <DeleteStageDialog />
    </div>
  );
}

/** Pipelines as tabs above the board, so the stages get the full width. */
function PipelineTabs({
  pipelines,
  selectedPipelineId,
  onSelect,
}: {
  pipelines: Array<{ id: string; name: string; isDefault: boolean; stages: Array<{ leadCount: number }> }>;
  selectedPipelineId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Pipelines"
      className="flex gap-1 overflow-x-auto border-b border-border/60 px-3 pt-2"
    >
      {pipelines.map((pipeline) => {
        const selected = pipeline.id === selectedPipelineId;
        const leads = pipeline.stages.reduce((sum, stage) => sum + (stage.leadCount ?? 0), 0);
        return (
          <button
            key={pipeline.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(pipeline.id)}
            className={cn(
              "relative -mb-px flex shrink-0 items-center gap-2 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors duration-fast ease-enter",
              selected
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {pipeline.name}
            {pipeline.isDefault ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Default
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground tabular-nums">{leads}</span>
          </button>
        );
      })}
    </div>
  );
}

function PipelineDetailSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
