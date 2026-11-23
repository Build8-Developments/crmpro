import Link from "next/link";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import { formatRate, projectLeadsHref, type ProjectDemandRow } from "./sources-types";

const VISIBLE_PROJECTS = 10;

/** Interest added in the period per project against what sold there. */
export function SourcesProjectDemand({
  projects,
  currency,
}: {
  projects: ProjectDemandRow[];
  currency: string;
}) {
  if (projects.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No project interest or deals in this period.
      </p>
    );
  }
  const visible = projects.slice(0, VISIBLE_PROJECTS);
  const maxInterest = Math.max(...visible.map((row) => row.interestedLeads), 1);

  return (
    <ul className="divide-y divide-border/50">
      {visible.map((row) => {
        const interestWidth = (row.interestedLeads / maxInterest) * 100;
        const dealWidth = (row.deals / maxInterest) * 100;
        return (
          <li key={row.projectId} className="space-y-1.5 py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <Link
                href={projectLeadsHref(row.projectId)}
                className="min-w-0 truncate font-medium hover:text-primary"
                title="Open every lead interested in this project (any date, so it can be more than this period's count)"
              >
                {row.name}
                {row.developerName ? (
                  <span className="font-normal text-muted-foreground"> · {row.developerName}</span>
                ) : null}
              </Link>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {formatCompactMoney(row.revenue, currency)}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
                style={{ width: `${Math.max(interestWidth, row.interestedLeads > 0 ? 2 : 0)}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${Math.max(dealWidth, row.deals > 0 ? 2 : 0)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {formatNumber(row.interestedLeads)} interested ({formatNumber(row.hotInterest)} hot) ·{" "}
              {formatNumber(row.deals)} deals · {formatRate(row.conversionRate)} converted
            </p>
          </li>
        );
      })}
      {projects.length > VISIBLE_PROJECTS ? (
        <li className="pt-2 text-[11px] text-muted-foreground">
          + {formatNumber(projects.length - VISIBLE_PROJECTS)} more projects
        </li>
      ) : null}
    </ul>
  );
}
