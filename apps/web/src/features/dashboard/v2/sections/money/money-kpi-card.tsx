import Link from "next/link";
import type { AppIcon } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

interface MoneyKpiCardProps {
  label: string;
  icon: AppIcon;
  value: string;
  href: string;
  /** Change vs the previous window, in %; null hides it. */
  changePercent: number | null;
  /** For cancellations a rise is bad. */
  higherIsWorse?: boolean;
  /** e.g. "vs same days last month: EGP 30M". */
  previousLabel: string;
  /** Target progress, when a target is set. */
  progress?: {
    percent: number | null;
    label: string;
    /** 0–100: where the bar should be by now (month to date). */
    expectedPercent?: number | null;
  };
  footnote?: string;
}

function ChangeBadge({ value, higherIsWorse }: { value: number; higherIsWorse?: boolean }) {
  const up = value > 0;
  const good = value === 0 ? null : up !== Boolean(higherIsWorse);
  return (
    <span
      className={cn(
        "rounded px-1 py-px text-[10px] font-semibold tabular-nums",
        good === null && "bg-muted text-muted-foreground",
        good === true && "bg-primary/10 text-primary",
        good === false && "bg-destructive/10 text-destructive",
      )}
    >
      {up ? "▲" : value < 0 ? "▼" : ""} {Math.abs(value).toFixed(value % 1 === 0 ? 0 : 1)}%
    </span>
  );
}

/** A money number with its change vs the previous window and target bar. */
export function MoneyKpiCard({
  label,
  icon: Icon,
  value,
  href,
  changePercent,
  higherIsWorse,
  previousLabel,
  progress,
  footnote,
}: MoneyKpiCardProps) {
  const barPercent = Math.min(100, Math.max(0, progress?.percent ?? 0));
  const behind =
    progress?.expectedPercent != null &&
    progress.percent != null &&
    progress.percent < progress.expectedPercent;

  return (
    <div className="flex min-w-0 flex-col justify-between gap-2 bg-card px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <Icon className="size-3.5 shrink-0 text-muted-foreground/55" stroke={1.75} />
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Link
            href={href}
            className="truncate rounded-sm text-[1.35rem] font-semibold leading-none tracking-tight tabular-nums hover:underline"
          >
            {value}
          </Link>
          {changePercent !== null ? (
            <ChangeBadge value={changePercent} higherIsWorse={higherIsWorse} />
          ) : null}
        </div>
        <p className="truncate text-[11px] text-muted-foreground">{previousLabel}</p>
      </div>

      {progress ? (
        <div className="space-y-1">
          <div
            className="relative h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(barPercent)}
            aria-label={`${label} vs target`}
          >
            <div
              className={cn("h-full rounded-full", behind ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${barPercent}%` }}
            />
            {progress.expectedPercent != null ? (
              <span
                className="absolute inset-y-0 w-px bg-foreground/50"
                style={{ left: `${Math.min(100, progress.expectedPercent)}%` }}
                aria-hidden
              />
            ) : null}
          </div>
          <p className={cn("truncate text-[11px]", behind ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
            {progress.label}
          </p>
        </div>
      ) : footnote ? (
        <p className="truncate text-[11px] text-muted-foreground">{footnote}</p>
      ) : null}
    </div>
  );
}
