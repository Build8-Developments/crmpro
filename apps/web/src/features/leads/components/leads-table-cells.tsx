import type { LeadAssigneeSummary } from "@/features/leads/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";

interface LeadAssigneeCellProps {
  assignee: LeadAssigneeSummary | null;
}

export function LeadAssigneeCell({ assignee }: LeadAssigneeCellProps) {
  if (!assignee) {
    return (
      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
        Unassigned
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Avatar size="sm" className="size-5">
        <AvatarFallback className="text-[9px] font-medium">
          {getInitials(assignee.name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{assignee.name}</span>
    </div>
  );
}
