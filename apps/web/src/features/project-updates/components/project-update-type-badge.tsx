import type { ProjectUpdateType } from "@/features/project-updates/types";
import { PROJECT_UPDATE_TYPE_LABELS } from "@/features/project-updates/utils/project-update-format";
import { cn } from "@/lib/utils";

const TYPE_TONES: Record<ProjectUpdateType, string> = {
  PRICE_CHANGE: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  NEW_PHASE: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  AVAILABILITY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  GENERAL: "bg-muted text-muted-foreground",
};

export function ProjectUpdateTypeBadge({
  type,
  className,
}: {
  type: ProjectUpdateType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap",
        TYPE_TONES[type],
        className,
      )}
    >
      {PROJECT_UPDATE_TYPE_LABELS[type]}
    </span>
  );
}
