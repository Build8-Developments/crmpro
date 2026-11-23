import Link from "next/link";
import type { ReactNode } from "react";
import type { AppIcon } from "@/components/icons/app-icons";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AttentionTileProps {
  label: string;
  icon: AppIcon;
  count: number;
  /** Where the number (and "Open list") goes. */
  href: string;
  /** One short line under the number. */
  hint?: ReactNode;
  /** Shown instead of the count when the rule is switched off. */
  offLabel?: string;
  /** Show "Reassign" (managers with lead.assign). */
  reassignHref?: string;
}

/** One number of the "Needs attention" strip, with its one-click actions. */
export function AttentionTile({
  label,
  icon: Icon,
  count,
  href,
  hint,
  offLabel,
  reassignHref,
}: AttentionTileProps) {
  const needsAttention = count > 0 && !offLabel;

  return (
    <div
      className={cn(
        "relative flex min-h-[7.25rem] flex-col justify-between gap-2 bg-card px-3.5 py-3",
        needsAttention && "bg-amber-500/[0.04]",
      )}
    >
      {needsAttention ? (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-500/70" aria-hidden />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium leading-tight text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            needsAttention ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground/55",
          )}
          stroke={1.75}
        />
      </div>

      <div className="min-w-0">
        {offLabel ? (
          <p className="text-xs text-muted-foreground">{offLabel}</p>
        ) : (
          <Link
            href={href}
            className={cn(
              "inline-block rounded-sm text-[1.5rem] font-semibold leading-none tracking-tight tabular-nums hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              needsAttention ? "text-amber-700 dark:text-amber-400" : "text-foreground",
            )}
            aria-label={`${formatNumber(count)} ${label} — open list`}
          >
            {formatNumber(count)}
          </Link>
        )}
        {hint ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>

      {needsAttention ? (
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <Link href={href} className="text-primary hover:underline">
            Open list
          </Link>
          {reassignHref ? (
            <Link
              href={reassignHref}
              className="text-muted-foreground hover:text-foreground hover:underline"
              title="Open the list, select the leads and use Assign"
            >
              Reassign
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
