import { IconMedal } from "@tabler/icons-react";
import type { Leaderboard, LeaderboardEntry, LeaderboardMode, RecentWin } from "@/features/performance/types";
import { PerformanceSection } from "@/features/performance/components/performance-section";
import { formatDay } from "@/features/performance/utils/performance-format";
import { formatPeriodLabel } from "@/features/targets/utils/target-format";
import { formatCompactMoney, formatNumber, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

const MEDALS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  2: "bg-slate-400/20 text-slate-700 dark:text-slate-300",
  3: "bg-orange-700/15 text-orange-800 dark:text-orange-400",
};

const RULES: Record<LeaderboardMode, string> = {
  TARGET_PERCENT:
    "Ranked by how much of their own monthly targets each person has reached (each target counts up to 150%). Nobody's money is shown.",
  RANK_ONLY: "Ranked by how much of their own monthly targets each person has reached. Only positions are shown.",
  FULL: "Ranked by contracted revenue, then deals reserved this month.",
};

const EMPTY: Record<LeaderboardMode, string> = {
  TARGET_PERCENT: "Nobody has moved on their targets yet this month. The first one leads.",
  RANK_ONLY: "Nobody has moved on their targets yet this month. The first one leads.",
  FULL: "No deals or contracts yet this month. The first one leads.",
};

/**
 * The top 3 this month and where you stand (spec §7 decision 4). What is
 * shown about others depends on the workspace's leaderboard setting; people
 * can appear as "A teammate". Recent badges add praise without numbers.
 */
export function LeaderboardCard({
  rank,
  currency,
  timeZone,
}: {
  rank: Leaderboard;
  currency: string;
  timeZone: string;
}) {
  const meInTop = rank.top.some((entry) => entry.isMe);
  return (
    <PerformanceSection
      title={`Leaderboard · ${formatPeriodLabel(rank.period)}`}
      hint={`${formatNumber(rank.participants)} ${rank.participants === 1 ? "person" : "people"}`}
    >
      {rank.top.length === 0 ? (
        <p className="text-xs text-muted-foreground">{EMPTY[rank.mode]}</p>
      ) : (
        <ol className="space-y-1.5">
          {rank.top.map((entry, index) => (
            <Row key={entry.userId ?? `teammate-${index}`} entry={entry} mode={rank.mode} currency={currency} />
          ))}
        </ol>
      )}
      {rank.me && !meInTop ? (
        <ul className="mt-2 border-t border-dashed border-border/80 pt-2" aria-label="Your rank">
          <Row entry={rank.me} mode={rank.mode} currency={currency} />
        </ul>
      ) : null}
      {rank.meHasNoTarget ? (
        <p className="mt-2 border-t border-dashed border-border/80 pt-2 text-xs text-muted-foreground">
          You have no target this month, so you&apos;re not ranked yet. Ask your manager to set one.
        </p>
      ) : null}
      <p className="mt-3 text-[11px] text-muted-foreground">{RULES[rank.mode]}</p>

      {rank.recentWins.length > 0 ? <RecentWins wins={rank.recentWins} timeZone={timeZone} /> : null}
    </PerformanceSection>
  );
}

function Row({
  entry,
  mode,
  currency,
}: {
  entry: LeaderboardEntry;
  mode: LeaderboardMode;
  currency: string;
}) {
  const name = entry.anonymous ? "A teammate" : (entry.name ?? "");
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
        {entry.anonymous ? "?" : getInitials(name)}
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", entry.anonymous && "text-muted-foreground italic")}>
        {name}
        {entry.isMe ? <span className="ml-1 text-xs font-normal text-muted-foreground not-italic">(you)</span> : null}
      </span>
      <Score entry={entry} mode={mode} currency={currency} />
    </li>
  );
}

function Score({ entry, mode, currency }: { entry: LeaderboardEntry; mode: LeaderboardMode; currency: string }) {
  if (mode === "FULL" && entry.revenue !== undefined) {
    return (
      <span className="shrink-0 text-right text-xs tabular-nums">
        <span className="block font-semibold">{formatCompactMoney(entry.revenue, currency)}</span>
        <span className="block text-muted-foreground">
          {formatNumber(entry.deals ?? 0)} {entry.deals === 1 ? "deal" : "deals"}
        </span>
      </span>
    );
  }
  if (entry.targetPercent === undefined) return null;
  return (
    <span className="shrink-0 text-right text-xs tabular-nums">
      <span className="block font-semibold">{formatNumber(entry.targetPercent)}%</span>
      <span className="block text-muted-foreground">of target</span>
    </span>
  );
}

function RecentWins({ wins, timeZone }: { wins: RecentWin[]; timeZone: string }) {
  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Recent wins</h3>
      <ul className="mt-2 space-y-1.5">
        {wins.map((win) => (
          <li key={`${win.badgeName}-${win.levelLabel}`} className="flex items-start gap-2 text-xs">
            <IconMedal className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{winners(win)}</span> unlocked{" "}
              <span className="font-medium">{win.badgeName}</span>
              <span className="text-muted-foreground"> · {win.levelLabel}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">{formatDay(win.unlockedAt, timeZone)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "You", "Mona and Omar", "Mona, Omar, Salma and 3 others". */
function winners(win: RecentWin): string {
  const names = win.people.map((person) => (person.isMe ? "You" : person.name));
  if (win.others > 0) names.push(`${win.others} ${win.others === 1 ? "other" : "others"}`);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
