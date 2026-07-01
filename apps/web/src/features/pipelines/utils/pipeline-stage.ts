import type { PipelineStage } from "@/features/pipelines/types";

export function isTerminalSystemStage(stage: PipelineStage): boolean {
  return (
    stage.isSystem &&
    (stage.closeType === "WON" || stage.closeType === "LOST")
  );
}

export function sortStages(stages: PipelineStage[]): PipelineStage[] {
  return [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDefaultInsertSortOrder(stages: PipelineStage[]): number {
  const ordered = sortStages(stages);
  const firstTerminalIndex = ordered.findIndex(isTerminalSystemStage);
  if (firstTerminalIndex === -1) {
    return ordered.length + 1;
  }
  return firstTerminalIndex + 1;
}

export function canDragStage(stage: PipelineStage): boolean {
  return !stage.isClosed && !isTerminalSystemStage(stage);
}

export function getDraggableStages(stages: PipelineStage[]): PipelineStage[] {
  return sortStages(stages).filter(canDragStage);
}

export function canMoveStageUp(
  stage: PipelineStage,
  stages: PipelineStage[],
): boolean {
  if (isTerminalSystemStage(stage)) return false;
  const ordered = sortStages(stages);
  const index = ordered.findIndex((item) => item.id === stage.id);
  if (index <= 0) return false;
  const previous = ordered[index - 1];
  return !isTerminalSystemStage(previous);
}

export function canMoveStageDown(
  stage: PipelineStage,
  stages: PipelineStage[],
): boolean {
  if (isTerminalSystemStage(stage)) return false;
  const ordered = sortStages(stages);
  const index = ordered.findIndex((item) => item.id === stage.id);
  if (index < 0 || index >= ordered.length - 1) return false;
  const next = ordered[index + 1];
  return !isTerminalSystemStage(next);
}

export const STAGE_COLOR_PRESETS = [
  "#94a3b8",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#f59e0b",
  "#22c55e",
  "#ef4444",
  "#f472b6",
  "#2dd4bf",
] as const;
