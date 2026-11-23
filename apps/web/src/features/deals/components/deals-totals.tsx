"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { DealStatus, DealTotals } from "@/features/deals/types";
import { DEAL_STATUS_LABELS } from "@/features/deals/utils/deal-format";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_ORDER: DealStatus[] = ["RESERVED", "CONTRACTED", "CANCELLED"];

const ACCENT: Record<DealStatus, string> = {
  RESERVED: "bg-amber-500",
  CONTRACTED: "bg-emerald-500",
  CANCELLED: "bg-muted-foreground/40",
};

/** Count and value per status, plus commission on live deals, for the filtered set. */
export function DealsTotals({
  totals,
  currency,
  isLoading,
}: {
  totals: DealTotals | undefined;
  currency: string;
  isLoading: boolean;
}) {
  if (!totals) {
    return isLoading ? (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[4.5rem] rounded-xl" />
        ))}
      </div>
    ) : null;
  }

  const liveCommission =
    totals.byStatus.RESERVED.commission + totals.byStatus.CONTRACTED.commission;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATUS_ORDER.map((status) => {
        const bucket = totals.byStatus[status];
        return (
          <div
            key={status}
            className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
          >
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", ACCENT[status])} />
              {DEAL_STATUS_LABELS[status]}
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                status === "CANCELLED" && "text-muted-foreground",
              )}
            >
              {formatMoney(bucket.price, currency, { compact: true })}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatNumber(bucket.count)} deal{bucket.count === 1 ? "" : "s"}
            </p>
          </div>
        );
      })}
      <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Commission
        </p>
        <p className="mt-1 text-lg font-semibold tabular-nums">
          {formatMoney(liveCommission, currency, { compact: true })}
        </p>
        <p className="text-xs text-muted-foreground">Reserved + contracted</p>
      </div>
    </div>
  );
}
