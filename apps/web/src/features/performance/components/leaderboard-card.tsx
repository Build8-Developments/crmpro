import type { Leaderboard, LeaderboardEntry } from "@/features/performance/types";
import { PerformanceSection } from "@/features/performance/components/performance-section";
import { formatCompactMoney, formatPeriodLabel } from "@/features/targets/utils/target-format";
import { formatNumber, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const MEDALS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  2: "bg-slate-400/20 text-slate-700 dark:text-slate-300",
  3: "bg-orange-700/15 text-orange-800 dark:text-orange-400",
};

/** Decision 4 (spec §7): the top 3 this month, and where you stand. */
export function LeaderboardCard({ rank, currency }: { rank: Leaderboard; currency: string }) {
  const meInTop = rank.top.some((entry) => entry.isMe);
  return (
    <PerformanceSection
      title={`Leaderboard · ${formatPeriodLabel(rank.period)}`}
      hint={`${formatNumber(rank.participants)} ${rank.participants === 1 ? "person" : "people"}`}
    >
      {rank.top.length === 0 ? (
        <p className="text-xs text-muted-foreground">No deals or contracts yet this month — the first one leads.</p>
      ) : (
        <ol className="space-y-1.5">
          {rank.top.map((entry) => (
            <Row key={entry.userId} entry={entry} currency={currency} />
          ))}
        </ol>
      )}
      {rank.me && !meInTop ? (
        <ul className="mt-2 border-t border-dashed border-border/80 pt-2" aria-label="Your rank">
          <Row entry={rank.me} currency={currency} />
        </ul>
      ) : null}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Ranked by contracted revenue, then deals reserved this month.
      </p>
    </PerformanceSection>
  );
}

function Row({ entry, currency }: { entry: LeaderboardEntry; currency: string }) {
  return (
    <li
      className={cn(
        "flex list-none items-center gap-2.5 rounded-lg px-2 py-1.5",
        entry.isMe && "bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
          MEDALS[entry.rank] ?? "bg-muted text-muted-foreground",
        )}
      >
        {entry.rank}
      </span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
        {getInitials(entry.name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {entry.name}
        {entry.isMe ? <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span> : null}
      </span>
      <span className="shrink-0 text-right text-xs tabular-nums">
        <span className="block font-semibold">{formatCompactMoney(entry.revenue, currency)}</span>
        <span className="block text-muted-foreground">
          {formatNumber(entry.deals)} {entry.deals === 1 ? "deal" : "deals"}
        </span>
      </span>
    </li>
  );
}
