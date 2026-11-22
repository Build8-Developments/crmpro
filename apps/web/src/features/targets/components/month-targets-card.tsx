"use client";

import { TargetProgressBar } from "@/features/targets/components/target-progress-bar";
import { useMyTargets } from "@/features/targets/hooks";
import type { MetricProgress } from "@/features/targets/types";
import { formatMetricValue, METRIC_LABELS } from "@/features/targets/utils/target-format";
import { cn } from "@/lib/utils";

/**
 * Today side panel (workflow spec §4.4): this month's targets as progress
 * bars with "on track / behind by N". Hidden until a target is set.
 */
export function MonthTargetsCard() {
  const { data } = useMyTargets();
  if (!data) return null;

  const mine = data.metrics.filter((metric) => metric.target !== null);
  const workspace = data.workspace?.metrics.filter((metric) => metric.target !== null) ?? [];
  if (mine.length === 0 && workspace.length === 0) return null;

  const daysLeft = Math.max(0, Math.floor(data.pace.workingDays - data.pace.elapsedWorkingDays));

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">This month&apos;s targets</h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {daysLeft} working {daysLeft === 1 ? "day" : "days"} left
        </span>
      </div>
      {mine.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-1">
          {mine.map((metric) => (
            <ProgressLine key={metric.metric} progress={metric} currency={data.currency} />
          ))}
        </ul>
      ) : null}
      {workspace.length > 0 ? (
        <div className={cn(mine.length > 0 && "mt-4 border-t border-border/60 pt-3")}>
          <h3 className="text-[11px] font-medium text-muted-foreground">Workspace</h3>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-1">
            {workspace.map((metric) => (
              <ProgressLine key={metric.metric} progress={metric} currency={data.currency} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ProgressLine({ progress, currency }: { progress: MetricProgress; currency: string }) {
  const target = progress.target ?? 0;
  const format = (value: number) => formatMetricValue(progress.metric, value, currency);
  return (
    <li className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{METRIC_LABELS[progress.metric]}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="text-foreground">{format(progress.actual)}</span> / {format(target)}
        </span>
      </div>
      <TargetProgressBar
        actual={progress.actual}
        target={target}
        expected={progress.expected}
        tone={progress.status === "HIT" ? "success" : progress.status === "BEHIND" ? "warning" : "default"}
      />
      <StatusLabel progress={progress} format={format} />
    </li>
  );
}

function StatusLabel({ progress, format }: { progress: MetricProgress; format: (value: number) => string }) {
  if (progress.status === "HIT") {
    return <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Target hit</p>;
  }
  if (progress.status === "BEHIND") {
    return <p className="text-[11px] text-amber-700 dark:text-amber-400">Behind by {format(progress.behindBy)}</p>;
  }
  return <p className="text-[11px] text-muted-foreground">On track</p>;
}
