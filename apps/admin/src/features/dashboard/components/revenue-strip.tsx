import type { PlatformRevenueStats } from "@/features/dashboard/types";
import { formatMoney, formatNumber } from "@/lib/format";

interface RevenueStripProps {
  revenue: PlatformRevenueStats;
}

export function RevenueStrip({ revenue }: RevenueStripProps) {
  if (revenue.mrrByCurrency.length === 0) {
    return (
      <div className="border-t border-border/50 px-3.5 py-2.5 text-[11px] text-muted-foreground">
        MRR unavailable — no active contracts with a standard billing frequency.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 px-3.5 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        MRR by currency
      </span>
      {revenue.mrrByCurrency.map((row) => (
        <span
          key={row.currency}
          className="inline-flex items-baseline gap-1.5 text-[11px]"
        >
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(row.mrr, row.currency)}
          </span>
          <span className="text-muted-foreground">
            /mo · {formatNumber(row.contractCount)} contracts
          </span>
        </span>
      ))}
    </div>
  );
}
