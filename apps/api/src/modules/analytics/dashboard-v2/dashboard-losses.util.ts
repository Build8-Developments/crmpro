import type {
  DashboardConversionCohort,
  DashboardLossesStage,
  DashboardLostBreakdownRow,
} from './dashboard-losses.types';

/** part / whole × 100 with one decimal; null when there is no whole. */
export function percent(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** One group of cohort leads with the same furthest open stage and won flag. */
export interface CohortBucket {
  month: string;
  /** Highest sortOrder among the open stages the lead was ever in; null if none. */
  maxOpenSort: number | null;
  won: boolean;
  count: number;
}

/**
 * Share of each created-month cohort that reached each funnel step.
 *
 * Rules (documented on the dashboard):
 * - a lead "reached" a stage when its stage history (from/to of every
 *   STAGE_CHANGED) or its current stage includes it;
 * - reaching a later open stage implies passing every earlier one, and a won
 *   lead passed every open stage (deals skip steps in practice);
 * - the first step is the entry: every lead of the cohort is in it;
 * - Lost is not a step.
 */
export function buildCohorts(
  months: readonly string[],
  steps: readonly DashboardLossesStage[],
  buckets: readonly CohortBucket[],
): DashboardConversionCohort[] {
  return months.map((month) => {
    const rows = buckets.filter((bucket) => bucket.month === month);
    const leads = rows.reduce((sum, row) => sum + row.count, 0);
    const reached = steps.map((step, index) => {
      let count: number;
      if (index === 0) {
        count = leads;
      } else if (step.closeType === 'WON') {
        count = rows
          .filter((row) => row.won)
          .reduce((sum, row) => sum + row.count, 0);
      } else {
        count = rows
          .filter(
            (row) =>
              row.won ||
              (row.maxOpenSort !== null && row.maxOpenSort >= step.sortOrder),
          )
          .reduce((sum, row) => sum + row.count, 0);
      }
      return { stageId: step.stageId, count, percent: percent(count, leads) };
    });
    return {
      month,
      leads,
      reached: reached.map((step, index) => ({
        ...step,
        fromPrevious:
          index === 0 ? null : percent(step.count, reached[index - 1].count),
      })),
    };
  });
}

/** Lost leads grouped by one key (source or agent), with a count per reason. */
export function buildBreakdown(
  rows: ReadonlyArray<{
    key: string | null;
    reasonId: string | null;
    count: number;
  }>,
  nameOf: (key: string | null) => string,
  limit: number,
): DashboardLostBreakdownRow[] {
  const groups = new Map<string | null, Map<string | null, number>>();
  for (const row of rows) {
    const reasons = groups.get(row.key) ?? new Map<string | null, number>();
    reasons.set(row.reasonId, (reasons.get(row.reasonId) ?? 0) + row.count);
    groups.set(row.key, reasons);
  }
  return [...groups.entries()]
    .map(([key, reasons]) => ({
      id: key,
      name: nameOf(key),
      total: [...reasons.values()].reduce((sum, count) => sum + count, 0),
      reasons: [...reasons.entries()]
        .map(([reasonId, count]) => ({ reasonId, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, limit);
}
