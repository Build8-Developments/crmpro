import type { LeadStageSummary } from "@/features/leads/types";
import { Badge } from "@/components/ui/badge";
import { getStageColorStyles } from "@/features/leads/utils/stage-color";
import { cn } from "@/lib/utils";

interface LeadStageBadgeProps {
  stage: LeadStageSummary;
  archived?: boolean;
}

export function LeadStageBadge({ stage, archived }: LeadStageBadgeProps) {
  const styles = getStageColorStyles(stage.color);

  return (
    <div className="flex max-w-[9rem] items-center gap-1">
      <span
        className={cn(
          "inline-flex h-5 max-w-full items-center truncate rounded px-1.5 text-[11px] font-medium",
        )}
        style={{
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          border: `1px solid ${styles.borderColor}`,
        }}
      >
        {stage.name}
      </span>
      {archived ? (
        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
          Arc
        </Badge>
      ) : null}
    </div>
  );
}
