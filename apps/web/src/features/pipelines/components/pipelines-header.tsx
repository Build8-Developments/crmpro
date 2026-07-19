"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function PipelinesHeader() {
  const openCreatePipeline = usePipelineUiStore((s) => s.openCreatePipeline);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Pipelines
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sales stages and how leads move through your funnel
        </p>
      </div>
      {can("pipeline.create") ? (
        <Button size="sm" onClick={openCreatePipeline}>
          <AppIcons.create className="size-3.5" />
          New pipeline
        </Button>
      ) : null}
    </div>
  );
}
