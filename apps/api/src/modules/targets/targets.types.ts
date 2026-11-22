import type { TargetMetric } from '@crmpro/database';

/** One number per metric (actuals, or suggested values). */
export type MetricValues = Record<TargetMetric, number>;

/** Target per metric; null when none is set. */
export type MetricTargets = Record<TargetMetric, number | null>;

export interface TargetPerson {
  id: string;
  name: string;
  email: string;
  roleName: string | null;
  team: { id: string; name: string } | null;
}

export interface TargetRow {
  targets: MetricTargets;
  actuals: MetricValues;
}

export interface TargetsGridResponse {
  period: string;
  timeZone: string;
  currency: string;
  metrics: readonly TargetMetric[];
  /** Null when the caller only manages a team (no lead.read-all). */
  workspace: TargetRow | null;
  users: Array<TargetRow & { user: TargetPerson }>;
}

export interface TargetSuggestionsResponse {
  period: string;
  /** The complete months that were averaged, oldest first. */
  basedOn: string[];
  workspace: Record<TargetMetric, number | null> | null;
  users: Array<{ userId: string; values: Record<TargetMetric, number | null> }>;
}

export type TargetStatus = 'HIT' | 'ON_TRACK' | 'BEHIND';

export interface MetricProgress {
  metric: TargetMetric;
  target: number | null;
  actual: number;
  /** Where the number should be by now at an even pace; null without target. */
  expected: number | null;
  /** actual / target × 100 (not capped); null without target. */
  percent: number | null;
  status: TargetStatus | null;
  /** How far below `expected`; 0 unless BEHIND. */
  behindBy: number;
}

export interface MonthPace {
  workingDays: number;
  elapsedWorkingDays: number;
  /** Share of the month's working time that has passed (0–1). */
  share: number;
}

export interface MyTargetsResponse {
  period: string;
  timeZone: string;
  currency: string;
  pace: MonthPace;
  /** True when at least one personal target is set. */
  hasTargets: boolean;
  metrics: MetricProgress[];
  /** Workspace totals, only for analytics.read + lead.read-all. */
  workspace: { hasTargets: boolean; metrics: MetricProgress[] } | null;
}
