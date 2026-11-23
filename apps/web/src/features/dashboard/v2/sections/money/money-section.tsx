"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSectionProps } from "@/features/dashboard/v2/period";
import { ApiError } from "@/lib/api/client";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import { MoneyForecastTable } from "./money-forecast-table";
import { useDashboardMoney } from "./money-hooks";
import { MoneyKpiCard } from "./money-kpi-card";
import { MoneyTrendChart } from "./money-trend-chart";
import {
  dealsHref,
  PREVIOUS_LABELS,
  type DashboardMoney,
  type MoneyTarget,
} from "./money-types";

const OWNER_LABELS: Record<MoneyTarget["owner"], string> = {
  workspace: "workspace target",
  team: "team target",
  own: "your target",
};

/**
 * Spec §5.2 — "Are we making money?": contracted revenue and commission vs
 * target, deal flow vs the previous window, weighted forecast and trend.
 */
export function MoneySection({ period }: DashboardSectionProps) {
  const query = useDashboardMoney(period);

  return (
    <section aria-labelledby="money-heading" className="space-y-3">
      <div>
        <h2 id="money-heading" className="text-sm font-semibold">
          Are we making money?
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Contracted deals count as revenue; cancelled deals never do. Compared {PREVIOUS_LABELS[period]}.
        </p>
      </div>

      {query.isPending ? (
        <MoneySkeleton />
      ) : query.isError ? (
        <MoneyError error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <MoneyContent data={query.data} />
      )}
    </section>
  );
}

function targetProgress(
  target: MoneyTarget | null,
  format: (value: number) => string,
): { percent: number | null; label: string; expectedPercent: number | null } | undefined {
  if (!target) return undefined;
  const basis = target.basis === "prorated" ? "prorated " : "";
  const percent = target.percent;
  const expectedPercent =
    target.expectedByNow !== null && target.value > 0
      ? (target.expectedByNow / target.value) * 100
      : null;
  const pace =
    target.expectedByNow !== null ? ` · ${format(target.expectedByNow)} expected by now` : "";
  return {
    percent,
    expectedPercent,
    label: `${percent === null ? "—" : `${Math.round(percent)}%`} of ${basis}${OWNER_LABELS[target.owner]} ${format(target.value)}${pace}`,
  };
}

function MoneyContent({ data }: { data: DashboardMoney }) {
  const money = (value: number) => formatCompactMoney(value, data.currency);
  const count = (value: number) => formatNumber(value);
  const previousLabel = PREVIOUS_LABELS[data.period.key];
  const { reserved, contracted, cancelled } = data.deals;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 shadow-sm min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MoneyKpiCard
          label="Revenue (contracted)"
          icon={AppIcons.contract}
          value={money(data.revenue.current)}
          href={dealsHref(contracted.listQuery)}
          changePercent={data.revenue.changePercent}
          previousLabel={`${previousLabel}: ${money(data.revenue.previous)}`}
          progress={targetProgress(data.revenue.target, money)}
          footnote="No revenue target set"
        />
        <MoneyKpiCard
          label="Commission"
          icon={AppIcons.percentage}
          value={money(data.commission.current)}
          href={dealsHref(contracted.listQuery)}
          changePercent={data.commission.changePercent}
          previousLabel={`${previousLabel}: ${money(data.commission.previous)}`}
          progress={targetProgress(data.commission.target, money)}
          footnote="No commission target set"
        />
        <MoneyKpiCard
          label="Deals reserved"
          icon={AppIcons.deals}
          value={count(reserved.count)}
          href={dealsHref(reserved.listQuery)}
          changePercent={reserved.countChangePercent}
          previousLabel={`${money(reserved.value)} · ${previousLabel}: ${count(reserved.previousCount)}`}
          progress={targetProgress(reserved.target, count)}
          footnote="No deals target set"
        />
        <MoneyKpiCard
          label="Deals contracted"
          icon={AppIcons.check}
          value={count(contracted.count)}
          href={dealsHref(contracted.listQuery)}
          changePercent={contracted.countChangePercent}
          previousLabel={`${money(contracted.value)} · ${previousLabel}: ${count(contracted.previousCount)}`}
        />
        <MoneyKpiCard
          label="Deals cancelled"
          icon={AppIcons.close}
          value={count(cancelled.count)}
          href={dealsHref(cancelled.listQuery)}
          changePercent={cancelled.countChangePercent}
          higherIsWorse
          previousLabel={`${money(cancelled.value)} lost · ${previousLabel}: ${count(cancelled.previousCount)}`}
        />
        <MoneyKpiCard
          label="Reserved, not contracted"
          icon={AppIcons.clock}
          value={count(data.reservedBacklog.count)}
          href={dealsHref(data.reservedBacklog.listQuery)}
          changePercent={null}
          previousLabel={`${money(data.reservedBacklog.value)} waiting for a contract`}
          footnote="Live — all open reservations"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <MoneyTrendChart trend={data.trend} currency={data.currency} previousLabel={previousLabel} />
        <MoneyForecastTable forecast={data.forecast} currency={data.currency} />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Totals per deal date in the workspace time zone.{" "}
        <Link href="/deals" className="text-primary hover:underline">
          Open all deals
        </Link>
      </p>
    </div>
  );
}

function MoneySkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="space-y-3 bg-card px-3.5 py-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

function MoneyError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <AppIcons.alertCircle className="size-3.5" />
        {forbidden ? "Your plan or role does not include analytics." : "Could not load the money numbers."}
      </span>
      {forbidden ? null : (
        <Button type="button" size="xs" variant="outline" onClick={onRetry}>
          <AppIcons.refresh />
          Retry
        </Button>
      )}
    </div>
  );
}
