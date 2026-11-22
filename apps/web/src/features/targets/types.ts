export const TARGET_METRICS = ["DEALS", "REVENUE", "COMMISSION", "INTERACTIONS", "VISITS"] as const;
export type TargetMetric = (typeof TARGET_METRICS)[number];

export type MetricValues = Record<TargetMetric, number>;
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

export interface TargetsGrid {
  period: string;
  timeZone: string;
  currency: string;
  metrics: TargetMetric[];
  /** Null when the caller manages only a team. */
  workspace: TargetRow | null;
  users: Array<TargetRow & { user: TargetPerson }>;
}

export interface TargetSuggestions {
  period: string;
  basedOn: string[];
  workspace: Record<TargetMetric, number | null> | null;
  users: Array<{ userId: string; values: Record<TargetMetric, number | null> }>;
}

export interface SaveTargetsInput {
  period: string;
  entries: Array<{ userId: string | null; metric: TargetMetric; value: number | null }>;
}

export type TargetStatus = "HIT" | "ON_TRACK" | "BEHIND";

export interface MetricProgress {
  metric: TargetMetric;
  target: number | null;
  actual: number;
  expected: number | null;
  percent: number | null;
  status: TargetStatus | null;
  behindBy: number;
}

export interface MyTargets {
  period: string;
  timeZone: string;
  currency: string;
  pace: { workingDays: number; elapsedWorkingDays: number; share: number };
  hasTargets: boolean;
  metrics: MetricProgress[];
  workspace: { hasTargets: boolean; metrics: MetricProgress[] } | null;
}
