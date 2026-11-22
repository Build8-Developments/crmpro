import { cn } from "@/lib/utils";

/**
 * Thin actual-vs-target bar. Optional `expected` draws a tick where an even
 * pace would be by now.
 */
export function TargetProgressBar({
  actual,
  target,
  expected,
  tone = "default",
  className,
}: {
  actual: number;
  target: number;
  expected?: number | null;
  tone?: "default" | "success" | "warning";
  className?: string;
}) {
  const percent = target > 0 ? Math.min(100, (actual / target) * 100) : actual > 0 ? 100 : 0;
  const pacePercent =
    expected !== undefined && expected !== null && target > 0
      ? Math.min(100, (expected / target) * 100)
      : null;
  return (
    <div
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "default" && "bg-primary",
        )}
        style={{ width: `${percent}%` }}
      />
      {pacePercent !== null && pacePercent > 0 && pacePercent < 100 ? (
        <div
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground/40"
          style={{ left: `${pacePercent}%` }}
        />
      ) : null}
    </div>
  );
}
