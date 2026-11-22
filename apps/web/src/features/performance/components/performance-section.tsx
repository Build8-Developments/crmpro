import { cn } from "@/lib/utils";

/** Card frame used by every section of My performance. */
export function PerformanceSection({
  title,
  hint,
  action,
  className,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-xs sm:p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
