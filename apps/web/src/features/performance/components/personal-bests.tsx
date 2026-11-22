import { IconBolt, IconCalendarStats, IconCash, IconMapPin, type Icon } from "@tabler/icons-react";
import type { MyPerformance } from "@/features/performance/types";
import { PerformanceSection } from "@/features/performance/components/performance-section";
import { formatWeekOf } from "@/features/performance/utils/performance-format";
import { formatCompactMoney, formatPeriodLabel } from "@/features/targets/utils/target-format";
import { formatNumber } from "@/lib/format";

/** Spec §4.1 "Personal bests". */
export function PersonalBests({ data }: { data: MyPerformance }) {
  const { bests, currency } = data;
  const streak = bests.fastContactStreak;
  return (
    <PerformanceSection title="Personal bests">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Best
          icon={IconCash}
          label="Best month — revenue"
          value={bests.bestRevenueMonth ? formatCompactMoney(bests.bestRevenueMonth.value, currency) : "—"}
          detail={bests.bestRevenueMonth ? formatPeriodLabel(bests.bestRevenueMonth.period) : "No contracts yet"}
        />
        <Best
          icon={IconCalendarStats}
          label="Best month — deals"
          value={bests.bestDealsMonth ? formatNumber(bests.bestDealsMonth.value) : "—"}
          detail={bests.bestDealsMonth ? formatPeriodLabel(bests.bestDealsMonth.period) : "No deals yet"}
        />
        <Best
          icon={IconBolt}
          label="Fast first contacts in a row"
          value={formatNumber(streak.best)}
          detail={`Within ${streak.minutes} working min · current run ${formatNumber(streak.current)}`}
          title={streak.rule}
        />
        <Best
          icon={IconMapPin}
          label="Most visits in a week"
          value={bests.mostVisitsWeek ? formatNumber(bests.mostVisitsWeek.value) : "—"}
          detail={bests.mostVisitsWeek ? formatWeekOf(bests.mostVisitsWeek.weekStart) : "No visits yet"}
        />
      </ul>
    </PerformanceSection>
  );
}

function Best({
  icon: IconComponent,
  label,
  value,
  detail,
  title,
}: {
  icon: Icon;
  label: string;
  value: string;
  detail: string;
  title?: string;
}) {
  return (
    <li className="flex min-w-0 items-start gap-3 rounded-lg bg-muted/40 px-3 py-2.5" title={title}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <IconComponent className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="text-lg leading-tight font-semibold tabular-nums">{value}</div>
        <div className="truncate text-[11px] text-muted-foreground">{detail}</div>
      </div>
    </li>
  );
}
