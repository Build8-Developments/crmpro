"use client";

import { useEffect, useMemo, useState } from "react";
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
import { PipelineSidebar } from "@/features/pipelines/components/pipeline-sidebar";
import { PipelineStagesPanel } from "@/features/pipelines/components/pipeline-stages-panel";
import { PipelinesEmptyState } from "@/features/pipelines/components/pipelines-empty-state";
import { PipelinesHeader } from "@/features/pipelines/components/pipelines-header";
import { PipelinesPagination } from "@/features/pipelines/components/pipelines-pagination";
import { PipelinesSkeleton } from "@/features/pipelines/components/pipelines-skeleton";
import { usePipeline, usePipelines } from "@/features/pipelines/hooks";
import { usePipelinesUrlState } from "@/features/pipelines/hooks/use-pipelines-url-state";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const PIPELINES_PAGE_SIZE = 50;

export function PipelinesPage() {
  usePipelinesUrlState();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 400);

  const selectedPipelineId = usePipelineUiStore((s) => s.selectedPipelineId);
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );

  const { data, isLoading, isError, isFetching, refetch } = usePipelines({
    page,
    limit: PIPELINES_PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
    sortBy: "name",
    sortOrder: "asc",
  });

  const {
    data: selectedPipelineDetail,
    isLoading: detailLoading,
  } = usePipeline(selectedPipelineId ?? undefined);

  const pipelines = useMemo(() => data?.items ?? [], [data?.items]);
  const pagination = data?.pagination;
  const hasSearch = debouncedSearch.trim().length > 0;

  const selectedPipeline =
    selectedPipelineDetail ??
    pipelines.find((pipeline) => pipeline.id === selectedPipelineId) ??
    null;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

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
          <div className="grid h-[min(42rem,calc(100vh-10.5rem))] lg:grid-cols-[15rem_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col border-b border-border/50 lg:border-r lg:border-b-0">
              <PipelineSidebar
                pipelines={pipelines}
                selectedPipelineId={selectedPipelineId}
                search={search}
                onSearchChange={handleSearchChange}
                className="flex-1"
              />
              {pagination ? (
                <PipelinesPagination
                  pagination={pagination}
                  onPageChange={setPage}
                />
              ) : null}
            </div>
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
