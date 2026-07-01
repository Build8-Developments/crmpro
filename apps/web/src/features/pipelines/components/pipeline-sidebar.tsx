"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";
import type { Pipeline } from "@/features/pipelines/types";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";

interface PipelineSidebarProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  className?: string;
}

export function PipelineSidebar({
  pipelines,
  selectedPipelineId,
  className,
}: PipelineSidebarProps) {
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );

  return (
    <aside className={cn("flex flex-col p-2", className)}>
      <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Pipelines
      </p>
      <nav className="flex flex-col gap-0.5">
        {pipelines.map((pipeline) => {
          const selected = pipeline.id === selectedPipelineId;
          return (
            <button
              key={pipeline.id}
              type="button"
              onClick={() => setSelectedPipelineId(pipeline.id)}
              className={cn(
                "relative flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                selected
                  ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {selected ? (
                <span
                  className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate pl-1">
                {pipeline.name}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {pipeline.stages.reduce(
                  (sum, stage) => sum + (stage.leadCount ?? 0),
                  0,
                )}
              </span>
              {pipeline.isDefault ? (
                <AppIcons.check
                  className="size-3 shrink-0 text-primary"
                  aria-label="Default pipeline"
                />
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
