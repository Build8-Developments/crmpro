"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { usePermissions } from "@/hooks/use-permissions";

export function PipelinesEmptyState() {
  const openCreatePipeline = usePipelineUiStore((s) => s.openCreatePipeline);
  const { can } = usePermissions();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <AppIcons.pipelines className="size-6" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">No pipelines yet</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first pipeline with default stages to start tracking leads.
      </p>
      {can("pipeline.create") ? (
        <Button className="mt-6" onClick={openCreatePipeline}>
          <AppIcons.create className="size-4" />
          New pipeline
        </Button>
      ) : null}
    </div>
  );
}
