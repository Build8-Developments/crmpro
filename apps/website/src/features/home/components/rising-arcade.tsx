import { cn } from "@/lib/utils";

/**
 * The brand idea as a chart: a row of arches, each month a step above the last
 * ("this month above the last"). Arches grow when an ancestor `Reveal` is shown.
 * Heights are relative to the largest value.
 */
export function RisingArcade({
  values,
  labels,
  className,
  archClassName,
  highlightClassName = "bg-primary",
}: {
  values: number[];
  labels?: string[];
  className?: string;
  archClassName?: string;
  highlightClassName?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex h-full items-end gap-[6%]", className)} dir="ltr">
      {values.map((value, index) => {
        const last = index === values.length - 1;
        return (
          <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div
              className={cn(
                "arch-grow w-full rounded-t-full",
                last ? highlightClassName : (archClassName ?? "bg-primary/25"),
              )}
              style={{ height: `${(value / max) * 100}%`, "--i": index } as React.CSSProperties}
            />
            {labels?.[index] ? (
              <span className="w-full truncate text-center text-[11px] text-muted-foreground">{labels[index]}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
