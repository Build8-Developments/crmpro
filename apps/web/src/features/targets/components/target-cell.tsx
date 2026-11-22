"use client";

import { Input } from "@/components/ui/input";
import { TargetProgressBar } from "@/features/targets/components/target-progress-bar";
import type { TargetMetric } from "@/features/targets/types";
import {
  formatMetricValue,
  isMoneyMetric,
  METRIC_LABELS,
  parseTargetInput,
} from "@/features/targets/utils/target-format";
import { cn } from "@/lib/utils";

/**
 * One target input with the month's actual under it. The bar follows the
 * typed value so a manager sees the effect before saving.
 */
export function TargetCell({
  metric,
  value,
  actual,
  currency,
  changed,
  ownerLabel,
  onChange,
  className,
}: {
  metric: TargetMetric;
  value: string;
  actual: number;
  currency: string;
  changed: boolean;
  ownerLabel: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const parsed = parseTargetInput(metric, value);
  const invalid = parsed === undefined;
  const target = typeof parsed === "number" ? parsed : null;
  const money = isMoneyMetric(metric);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Input
        inputMode={money ? "decimal" : "numeric"}
        value={value}
        placeholder="No target"
        aria-label={`${METRIC_LABELS[metric]} target for ${ownerLabel}`}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-8 text-right tabular-nums placeholder:text-muted-foreground/60",
          changed && !invalid && "border-primary/60 bg-primary/5",
        )}
      />
      <div className="flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground tabular-nums">
        <span className="truncate">
          {formatMetricValue(metric, actual, currency)}
          {target !== null ? (
            <span className="text-muted-foreground/70"> / {formatMetricValue(metric, target, currency)}</span>
          ) : (
            <span className="text-muted-foreground/70"> done</span>
          )}
        </span>
        {target !== null && target > 0 ? (
          <span className={cn(actual >= target && "font-medium text-emerald-600 dark:text-emerald-400")}>
            {Math.round((actual / target) * 100)}%
          </span>
        ) : null}
      </div>
      {target !== null && target > 0 ? (
        <TargetProgressBar actual={actual} target={target} tone={actual >= target ? "success" : "default"} />
      ) : (
        <div className="h-1.5" aria-hidden />
      )}
    </div>
  );
}
