"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function PipelinesEmptyState() {
  const openCreatePipeline = usePipelineUiStore((s) => s.openCreatePipeline);
  const { can } = usePermissions();

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <AppIcons.pipelines className="size-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold text-foreground">
          No pipelines yet
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Create a pipeline with stages to track how leads move through your
          funnel.
        </p>
        {can("pipeline.create") ? (
          <Button size="sm" className="mt-4" onClick={openCreatePipeline}>
            <AppIcons.create className="size-3.5" />
            New pipeline
          </Button>
        ) : null}
      </div>
    </div>
  );
}
