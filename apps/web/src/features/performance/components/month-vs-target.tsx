import { TargetProgressBar } from "@/features/targets/components/target-progress-bar";
import type { MetricProgress, MyTargets } from "@/features/targets/types";
import {
  formatMetricValue,
  formatPeriodLabel,
  METRIC_LABELS,
} from "@/features/targets/utils/target-format";
import { PerformanceSection } from "@/features/performance/components/performance-section";

/** Spec §4.1 "This month vs target": every metric, with its target when one is set. */
export function MonthVsTarget({ month }: { month: MyTargets }) {
  const daysLeft = Math.max(0, Math.floor(month.pace.workingDays - month.pace.elapsedWorkingDays));
  return (
    <PerformanceSection
      title={`${formatPeriodLabel(month.period)} vs target`}
      hint={`${daysLeft} working ${daysLeft === 1 ? "day" : "days"} left`}
    >
      {month.hasTargets ? null : (
        <p className="mb-3 text-xs text-muted-foreground">
          No targets set for you this month yet — here is what you have done so far.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-1">
        {month.metrics.map((metric) => (
          <MetricLine key={metric.metric} progress={metric} currency={month.currency} />
        ))}
      </ul>
    </PerformanceSection>
  );
}

function MetricLine({ progress, currency }: { progress: MetricProgress; currency: string }) {
  const format = (value: number) => formatMetricValue(progress.metric, value, currency);
  if (progress.target === null) {
    return (
      <li className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{METRIC_LABELS[progress.metric]}</span>
        <span className="tabular-nums">
          <span className="text-sm font-semibold">{format(progress.actual)}</span>
          <span className="ml-1.5 text-muted-foreground">no target</span>
        </span>
      </li>
    );
  }
  const tone = progress.status === "HIT" ? "success" : progress.status === "BEHIND" ? "warning" : "default";
  return (
    <li className="min-w-0 space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{METRIC_LABELS[progress.metric]}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="text-sm font-semibold text-foreground">{format(progress.actual)}</span> /{" "}
          {format(progress.target)}
        </span>
      </div>
      <TargetProgressBar
        actual={progress.actual}
        target={progress.target}
        expected={progress.expected}
        tone={tone}
      />
      <p
        className={
          progress.status === "HIT"
            ? "text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
            : progress.status === "BEHIND"
              ? "text-[11px] text-amber-700 dark:text-amber-400"
              : "text-[11px] text-muted-foreground"
        }
      >
        {progress.status === "HIT"
          ? "Target hit"
          : progress.status === "BEHIND"
            ? `Behind by ${format(progress.behindBy)}`
            : "On track"}
      </p>
    </li>
  );
}
