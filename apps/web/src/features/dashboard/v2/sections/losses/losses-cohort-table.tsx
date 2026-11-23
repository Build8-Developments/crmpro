import { formatPeriodShort } from "@/features/targets/utils/target-format";
import { formatDays, formatNumber } from "@/lib/format";
import { formatShare, type ConversionCohort, type LossesStage, type StageDuration } from "./losses-types";

/**
 * Created-month cohorts × funnel steps: the share of each month's leads that
 * reached the step. Hover a cell for the count and the step-to-step rate.
 */
export function LossesCohortTable({
  stages,
  cohorts,
  durations,
}: {
  stages: LossesStage[];
  cohorts: ConversionCohort[];
  durations: StageDuration[];
}) {
  if (stages.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No pipeline yet.</p>;
  }
  const durationBy = new Map(durations.map((row) => [row.stageId, row]));
  const newestFirst = [...cohorts].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr className="text-[11px] text-muted-foreground">
            <th scope="col" className="px-1.5 py-1 text-left font-medium">
              Created
            </th>
            <th scope="col" className="px-1.5 py-1 text-right font-medium">
              Leads
            </th>
            {stages.map((stage) => (
              <th key={stage.stageId} scope="col" className="px-1.5 py-1 text-right font-medium whitespace-nowrap">
                {stage.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {newestFirst.map((cohort) => (
            <tr key={cohort.month}>
              <th scope="row" className="px-1.5 py-1 text-left font-normal whitespace-nowrap">
                {formatPeriodShort(cohort.month, true)}
              </th>
              <td className="px-1.5 py-1 text-right text-muted-foreground tabular-nums">
                {formatNumber(cohort.leads)}
              </td>
              {cohort.reached.map((step, index) => {
                const share = step.percent ?? 0;
                const isWon = stages[index]?.closeType === "WON";
                return (
                  <td
                    key={step.stageId}
                    className="rounded-[4px] px-1.5 py-1 text-right tabular-nums"
                    title={`${formatNumber(step.count)} of ${formatNumber(cohort.leads)} leads${
                      step.fromPrevious !== null ? ` · ${formatShare(step.fromPrevious)} of the previous step` : ""
                    }`}
                    style={
                      step.percent !== null
                        ? {
                            backgroundColor: `color-mix(in oklab, ${
                              isWon ? "var(--chart-2)" : "var(--primary)"
                            } ${Math.round(8 + share * 0.6)}%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {formatShare(step.percent)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-[11px] text-muted-foreground">
            <th scope="row" colSpan={2} className="px-1.5 pt-2 text-left font-normal">
              Avg days in stage
            </th>
            {stages.map((stage) => {
              const duration = durationBy.get(stage.stageId);
              return (
                <td
                  key={stage.stageId}
                  className="px-1.5 pt-2 text-right tabular-nums"
                  title={
                    duration && duration.exits > 0
                      ? `${formatNumber(duration.exits)} leads moved on in the period · median ${formatDays(duration.medianDays)}`
                      : "No lead left this stage in the period"
                  }
                >
                  {stage.closeType === "WON" ? "" : formatDays(duration?.avgDays ?? null)}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
