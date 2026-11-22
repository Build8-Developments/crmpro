import type { LeadStageSummary } from "@/features/leads/types";
import { StageBadge } from "@/components/crm/stage-visuals";

interface LeadStageBadgeProps {
  stage: LeadStageSummary;
  archived?: boolean;
  size?: "xs" | "sm";
}

/** A lead's stage as a small pill (icon + name); archived leads fade. */
export function LeadStageBadge({ stage, archived, size = "sm" }: LeadStageBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1">
      <StageBadge stage={stage} archived={archived} size={size} />
      {archived ? (
        <span className="text-[10px] font-medium text-muted-foreground">Archived</span>
      ) : null}
    </span>
  );
}
