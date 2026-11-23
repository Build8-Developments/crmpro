import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { formatNumber } from "@/lib/format";
import { leadsHref, type AttentionStageGroup } from "./attention-types";

interface AttentionStageListProps {
  stuck: AttentionStageGroup;
  stale: AttentionStageGroup;
}

/** Stuck (R9) and stale (R8) leads per stage, each linking to its list. */
export function AttentionStageList({ stuck, stale }: AttentionStageListProps) {
  const groups = [
    { key: "stuck", label: "Stuck", unit: "in stage", group: stuck },
    { key: "stale", label: "Stale", unit: "without contact", group: stale },
  ].filter((entry) => entry.group.byStage.length > 0);

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/50 px-3.5 py-2.5">
        <AppIcons.stageChange className="size-3.5 text-muted-foreground" stroke={1.75} />
        <h3 className="truncate text-xs font-semibold">Stuck & stale by stage</h3>
      </div>
      <div className="space-y-2.5 px-3.5 py-2.5">
        {groups.map(({ key, label, unit, group }) => {
          // Two pipelines can both have a "Proposal": name the pipeline then.
          const names = group.byStage.map((row) => row.stageName);
          const repeated = new Set(names.filter((name, index) => names.indexOf(name) !== index));
          return (
          <div key={key}>
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
            <ul className="flex flex-wrap gap-1.5">
              {group.byStage.map((row) => (
                <li key={row.stageId}>
                  <Link
                    href={leadsHref(row.listQuery)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] hover:bg-muted"
                    title={`${row.pipelineName} · over ${row.thresholdDays} days ${unit}`}
                  >
                    <span className="font-medium">
                      {row.stageName}
                      {repeated.has(row.stageName) ? (
                        <span className="font-normal text-muted-foreground"> · {row.pipelineName}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">&gt;{row.thresholdDays}d</span>
                    <span className="font-semibold tabular-nums">{formatNumber(row.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>
    </div>
  );
}
