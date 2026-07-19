"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Input } from "@/components/ui/input";
import type { Pipeline } from "@/features/pipelines/types";
import { usePipelineUiStore } from "@/features/pipelines/stores/pipeline-ui-store";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PipelineSidebarProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  className?: string;
}

export function PipelineSidebar({
  pipelines,
  selectedPipelineId,
  search,
  onSearchChange,
  className,
}: PipelineSidebarProps) {
  const setSelectedPipelineId = usePipelineUiStore(
    (s) => s.setSelectedPipelineId,
  );

  return (
    <aside className={cn("flex min-h-0 flex-col bg-muted/20", className)}>
      <div className="border-b border-border/40 px-3 py-2.5">
        <div className="relative">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter pipelines..."
            className="h-8 border-transparent bg-background pl-8 text-xs shadow-none"
            aria-label="Search pipelines"
          />
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {pipelines.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No matching pipelines
          </p>
        ) : (
          <ul className="space-y-1">
            {pipelines.map((pipeline) => {
              const selected = pipeline.id === selectedPipelineId;
              const leadTotal = pipeline.stages.reduce(
                (sum, stage) => sum + (stage.leadCount ?? 0),
                0,
              );

              return (
                <li key={pipeline.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPipelineId(pipeline.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      selected
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/70 text-muted-foreground",
                      )}
                    >
                      <AppIcons.pipelines className="size-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-foreground">
                          {pipeline.name}
                        </span>
                        {pipeline.isDefault ? (
                          <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                            Default
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                        {formatNumber(leadTotal)} leads
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
