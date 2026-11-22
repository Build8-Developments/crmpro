import type { Badge } from "@/features/performance/types";
import { PerformanceSection } from "@/features/performance/components/performance-section";
import {
  BADGE_ICONS,
  formatBadgeValue,
  formatDay,
} from "@/features/performance/utils/performance-format";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Spec §4.1 badges: unlocked ones in colour with "unlocked on", locked ones
 * greyed with progress toward the next level.
 */
export function BadgesGrid({
  badges,
  currency,
  timeZone,
}: {
  badges: Badge[];
  currency: string;
  timeZone: string;
}) {
  const unlocked = badges.reduce(
    (sum, badge) => sum + badge.levels.filter((level) => level.unlockedAt).length,
    0,
  );
  const total = badges.reduce((sum, badge) => sum + badge.levels.length, 0);
  return (
    <PerformanceSection title="Badges" hint={`${unlocked} of ${total} levels unlocked`}>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge) => (
          <BadgeCard key={badge.key} badge={badge} currency={currency} timeZone={timeZone} />
        ))}
      </ul>
    </PerformanceSection>
  );
}

function BadgeCard({ badge, currency, timeZone }: { badge: Badge; currency: string; timeZone: string }) {
  const IconComponent = BADGE_ICONS[badge.key];
  const current = badge.levels.find((level) => level.level === badge.currentLevel) ?? null;
  const isUnlocked = current !== null && current.unlockedAt !== null;
  const value = (amount: number) => formatBadgeValue(badge.unit, amount, currency);

  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border p-3",
        isUnlocked ? "border-amber-500/30 bg-amber-500/5" : "border-border/60 bg-muted/20",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isUnlocked
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground/60",
          )}
          aria-hidden
        >
          <IconComponent className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className={cn("truncate text-sm font-semibold", !isUnlocked && "text-muted-foreground")}>
              {badge.name}
            </h3>
            <LevelPips badge={badge} timeZone={timeZone} />
          </div>
          <p className="text-xs">
            {isUnlocked && current ? (
              <span className="font-medium">{current.label}</span>
            ) : (
              <span className="text-muted-foreground">Locked</span>
            )}
          </p>
          {isUnlocked && current?.unlockedAt ? (
            <p className="text-[11px] text-muted-foreground">Unlocked on {formatDay(current.unlockedAt, timeZone)}</p>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{badge.description}</p>

      {badge.next ? (
        <div className="mt-auto space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="truncate text-muted-foreground">
              Next: <span className="font-medium text-foreground">{badge.next.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {badge.next.needsSample && badge.minSample !== null ? (
                <>
                  {formatNumber(badge.sample ?? 0)} / {formatNumber(badge.minSample)} {badge.sampleLabel}
                </>
              ) : (
                <>
                  {value(badge.value)} / {value(badge.next.threshold)}
                  {badge.unit === "count" ? ` ${badge.unitLabel}` : null}
                </>
              )}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={`Progress toward ${badge.next.label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(badge.next.progress * 100)}
          >
            <div
              className={cn("h-full rounded-full", isUnlocked ? "bg-amber-500" : "bg-muted-foreground/40")}
              style={{ width: `${Math.round(badge.next.progress * 100)}%` }}
            />
          </div>
          {badge.unit === "percent" && badge.sample !== null && !badge.next.needsSample ? (
            <p className="text-[11px] text-muted-foreground">
              Over {formatNumber(badge.sample)} {badge.sampleLabel}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-auto text-[11px] font-medium text-amber-700 dark:text-amber-400">
          All levels unlocked · {value(badge.value)}
          {badge.unit === "count" ? ` ${badge.unitLabel}` : null}
        </p>
      )}
    </li>
  );
}

/** One dot per level; hover shows the level and when it was unlocked. */
function LevelPips({ badge, timeZone }: { badge: Badge; timeZone: string }) {
  if (badge.levels.length < 2) return null;
  return (
    <span className="flex shrink-0 items-center gap-1" aria-label={`Level ${badge.currentLevel} of ${badge.levels.length}`}>
      {badge.levels.map((level) => (
        <span
          key={level.level}
          title={
            level.unlockedAt
              ? `${level.label} · unlocked on ${formatDay(level.unlockedAt, timeZone)}`
              : `${level.label} · locked`
          }
          className={cn("size-1.5 rounded-full", level.unlockedAt ? "bg-amber-500" : "bg-muted-foreground/25")}
        />
      ))}
    </span>
  );
}
