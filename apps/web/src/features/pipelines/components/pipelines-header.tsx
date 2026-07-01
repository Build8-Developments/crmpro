"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function PipelinesHeader() {
  const openCreatePipeline = usePipelineUiStore((s) => s.openCreatePipeline);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pipelines
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure sales stages and how leads move through your funnel
        </p>
      </div>
      {can("pipeline.create") ? (
        <Button size="sm" onClick={openCreatePipeline}>
          <AppIcons.create className="size-4" />
          New pipeline
        </Button>
      ) : null}
    </div>
  );
}
