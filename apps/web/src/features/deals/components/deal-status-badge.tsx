import { Badge } from "@/components/ui/badge";
import type { DealStatus } from "@/features/deals/types";
import { DEAL_STATUS_LABELS } from "@/features/deals/utils/deal-format";
import { cn } from "@/lib/utils";

const VARIANT = {
  RESERVED: "warning",
  CONTRACTED: "default",
  CANCELLED: "outline",
} as const;

export function DealStatusBadge({
  status,
  className,
}: {
  status: DealStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={VARIANT[status]}
      className={cn(
        "h-5 px-1.5 text-[10px]",
        status === "CANCELLED" && "text-muted-foreground line-through decoration-1",
        className,
      )}
    >
      {DEAL_STATUS_LABELS[status]}
    </Badge>
  );
}
