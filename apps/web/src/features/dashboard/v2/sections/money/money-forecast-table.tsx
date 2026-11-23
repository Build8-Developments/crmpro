import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { DashboardSectionCard } from "@/features/dashboard/components/dashboard-section-card";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import { leadsListHref, type DashboardMoney } from "./money-types";

interface MoneyForecastTableProps {
  forecast: DashboardMoney["forecast"];
  currency: string;
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

function formatDeals(value: number): string {
  return value.toFixed(1);
}

/** Weighted pipeline: per stage open leads × historical win rate × average deal. */
export function MoneyForecastTable({ forecast, currency }: MoneyForecastTableProps) {
  const pipelines = new Set(forecast.stages.map((row) => row.pipelineId));
  const showPipeline = pipelines.size > 1;

  return (
    <DashboardSectionCard
      icon={AppIcons.chartBar}
      title="Weighted pipeline forecast"
      subtitle="Open leads × historical win rate × average deal"
      badges={
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
          ≈ {formatCompactMoney(forecast.totals.expectedRevenue, currency)}
        </Badge>
      }
      className="h-full"
      contentClassName="px-0 py-0"
    >
      {forecast.stages.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground">No open leads in the pipeline.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-xs">
            <thead>
              <tr className="border-b border-border/50 text-[11px] text-muted-foreground">
                <th className="px-4 py-2 text-left font-medium">Stage</th>
                <th className="px-2 py-2 text-right font-medium">Open</th>
                <th className="px-2 py-2 text-right font-medium" title="Closed leads that reached the stage and were won">
                  Win rate
                </th>
                <th className="px-2 py-2 text-right font-medium">Exp. deals</th>
                <th className="px-4 py-2 text-right font-medium">Exp. revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {forecast.stages.map((row) => (
                <tr key={row.stageId}>
                  <td className="max-w-[12rem] truncate px-4 py-1.5">
                    <span className="font-medium">{row.stageName}</span>
                    {showPipeline ? <span className="text-muted-foreground"> · {row.pipelineName}</span> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {row.openLeads > 0 ? (
                      <Link href={leadsListHref(row.listQuery)} className="hover:underline">
                        {formatNumber(row.openLeads)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td
                    className="px-2 py-1.5 text-right tabular-nums text-muted-foreground"
                    title={`${formatNumber(row.wonCount)} won of ${formatNumber(row.reachedCount)} closed`}
                  >
                    {formatRate(row.winRate)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatDeals(row.expectedDeals)}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums">
                    {formatCompactMoney(row.expectedRevenue, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/60 font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatNumber(forecast.totals.openLeads)}</td>
                <td className="px-2 py-2" />
                <td className="px-2 py-2 text-right tabular-nums">{formatDeals(forecast.totals.expectedDeals)}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatCompactMoney(forecast.totals.expectedRevenue, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="border-t border-border/50 px-4 py-2 text-[11px] text-muted-foreground">
            {forecast.method} Average deal {formatCompactMoney(forecast.averageDealPrice, currency)} from{" "}
            {formatNumber(forecast.averageDealSampleSize)} deals.
          </p>
        </div>
      )}
    </DashboardSectionCard>
  );
}
