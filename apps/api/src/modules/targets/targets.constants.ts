import { TargetMetric } from '@crmpro/database';

/** Column order everywhere (grid, Today card, suggestions). */
export const TARGET_METRICS: readonly TargetMetric[] = [
  TargetMetric.DEALS,
  TargetMetric.REVENUE,
  TargetMetric.COMMISSION,
  TargetMetric.INTERACTIONS,
  TargetMetric.VISITS,
];

/** Metrics counted in whole units; the rest are money. */
export const COUNT_METRICS: ReadonlySet<TargetMetric> = new Set([
  TargetMetric.DEALS,
  TargetMetric.INTERACTIONS,
  TargetMetric.VISITS,
]);

export const MAX_TARGET_ENTRIES = 500;

/** Upper bound that still fits Decimal(16, 2). */
export const MAX_TARGET_VALUE = 99_999_999_999_999;

/** Suggested money targets are rounded to this step (EGP 10,000). */
export const MONEY_SUGGESTION_STEP = 10_000;

/** Months averaged by "Suggest from last 3 months". */
export const SUGGESTION_MONTHS = 3;

export const TARGET_AUDIT_ACTIONS = {
  UPDATED: 'TARGETS_UPDATED',
} as const;

export const TARGET_AUDIT_ENTITY = 'Target';
