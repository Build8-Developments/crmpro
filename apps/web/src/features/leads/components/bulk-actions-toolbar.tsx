"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-border/80 bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur-md",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-200",
      )}
    >
      <span className="text-sm font-medium tabular-nums">
        {selectedCount} selected
      </span>
      <div className="h-4 w-px bg-border" />
      <Button type="button" variant="secondary" size="sm" disabled>
        <AppIcons.userPlus className="size-4" />
        Assign
      </Button>
      <Button type="button" variant="secondary" size="sm" disabled>
        <AppIcons.stageChange className="size-4" />
        Move stage
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        Clear selection
      </Button>
    </div>
  );
}
