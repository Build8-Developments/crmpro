import Link from "next/link";
import { dashboardLeadLinks } from "@/features/dashboard/dashboard-links";
import { formatNumber } from "@/lib/format";
import type { DashboardLosses } from "./losses-types";

function formatDay(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone, day: "numeric", month: "short" });
}

/** Leads won in the period after having been lost (recycling that paid off). */
export function LossesWonBack({
  wonBack,
  timeZone,
}: {
  wonBack: DashboardLosses["wonBack"];
  timeZone: string;
}) {
  const stats: Array<[string, number, string]> = [
    ["Won back", wonBack.count, "Lost before, won in the period"],
    ["After re-engage", wonBack.viaReEngage, "A re-engage task came between the loss and the win"],
    ["Re-engage tasks", wonBack.reEngageTasks, "Re-engage tasks created in the period"],
  ];

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-2">
        {stats.map(([label, value, hint]) => (
          <div key={label} className="rounded-lg bg-muted/50 px-2.5 py-2" title={hint}>
            <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
            <dd className="text-base font-semibold tabular-nums">{formatNumber(value)}</dd>
          </div>
        ))}
      </dl>
      {wonBack.leads.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">No lost lead was won back in this period.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {wonBack.leads.map((lead) => (
            <li key={lead.leadId} className="py-2 first:pt-0 last:pb-0">
              <Link href={dashboardLeadLinks.lead(lead.leadId)} className="block text-xs hover:text-primary">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{lead.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {formatDay(lead.lostAt, timeZone)} → {formatDay(lead.wonAt, timeZone)}
                  </span>
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {lead.lostReasonName ?? "No reason"}
                  {lead.agent ? ` · ${lead.agent.name}` : ""}
                  {lead.viaReEngage ? " · re-engaged" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
