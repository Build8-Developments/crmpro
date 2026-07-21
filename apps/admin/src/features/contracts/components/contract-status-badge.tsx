"use client";

import { Badge } from "@/components/ui/badge";
import type { ContractStatus } from "@/features/contracts/types";
import { CONTRACT_STATUS_LABELS } from "@/features/contracts/types";
import { cn } from "@/lib/utils";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 text-[10px] font-medium",
        status === "ACTIVE" &&
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "DRAFT" &&
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "EXPIRED" &&
          "border-border bg-muted/50 text-muted-foreground",
        status === "TERMINATED" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      {CONTRACT_STATUS_LABELS[status]}
    </Badge>
  );
}
