import { Badge } from "@/components/ui/badge";
import type { PlatformSystemHealth } from "@/features/dashboard/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  systemHealth?: PlatformSystemHealth;
  attentionCount?: number;
  isRefreshing?: boolean;
}

export function DashboardHeader({
  systemHealth,
  attentionCount = 0,
  isRefreshing = false,
}: DashboardHeaderProps) {
  const isOk = systemHealth?.status === "ok";
  const isDegraded = systemHealth?.status === "degraded";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Ops console
          </h1>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Updating…
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What needs attention across tenants, contracts, and imports
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {attentionCount > 0 ? (
          <Badge
            variant="outline"
            className="h-7 gap-1.5 border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] text-amber-700 dark:text-amber-400"
          >
            {formatNumber(attentionCount)} needing attention
          </Badge>
        ) : null}
        {systemHealth ? (
          <Badge
            variant={isDegraded ? "warning" : "outline"}
            className={cn(
              "h-7 gap-1.5 px-2.5 text-[11px]",
              isOk &&
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                isOk ? "bg-emerald-500" : "bg-amber-500",
              )}
              aria-hidden
            />
            {isOk ? "Healthy" : "Degraded"}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
