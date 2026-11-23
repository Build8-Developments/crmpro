import { InteractionChannel, InteractionOutcome } from '@crmpro/database';

/** Scheduler job (see DailyStatsJobService). */
export const DAILY_STATS_JOB = 'daily-stats';
export const DAILY_STATS_EVERY_MS = 15 * 60_000;

/** First run for a tenant (no rows yet) fills this many past days. */
export const BACKFILL_DAYS = 90;
/** Days computed per tenant per tick while a backfill is running. */
export const BACKFILL_BATCH_DAYS = 10;

/**
 * Interactions can be back-dated up to 48h (spec §2.1), so a day is computed
 * once right after it ends and once more after this window has closed.
 */
export const BACKDATE_WINDOW_MS = 48 * 60 * 60_000;

/** A running pass (one tenant, one day) blocks others for at most this long. */
export const PASS_CLAIM_TTL_SECONDS = 10 * 60;
/** A finished final pass is remembered this long (claim-once). */
export const FINAL_CLAIM_TTL_SECONDS = 4 * 24 * 60 * 60;
/** Backfill progress is kept this long. */
export const BACKFILL_STATE_TTL_SECONDS = 30 * 24 * 60 * 60;
/** A completed backfill is remembered this long. */
export const BACKFILL_DONE_TTL_SECONDS = 365 * 24 * 60 * 60;

/** On-demand refresh of one user's "today": at most once per this window. */
export const REFRESH_THROTTLE_SECONDS = 60;

/** SLA deadlines are at most a couple of weeks after assignment. */
export const SLA_LOOKBACK_DAYS = 15;

/** `GET /stats/daily` returns at most this many days. */
export const MAX_RANGE_DAYS = 366;
export const DEFAULT_RANGE_DAYS = 30;

/** Streak (see computeStreak). */
export const STREAK_TASK_RATIO = 0.8;
export const STREAK_LOOKBACK_DAYS = 366;

/** Phone-like touches. */
export const CALL_CHANNELS: ReadonlySet<InteractionChannel> = new Set([
  InteractionChannel.CALL,
  InteractionChannel.VIDEO_CALL,
]);

/** The client actually responded. */
export const ANSWERED_OUTCOMES: ReadonlySet<InteractionOutcome> = new Set([
  InteractionOutcome.ANSWERED_INTERESTED,
  InteractionOutcome.ANSWERED_NOT_NOW,
  InteractionOutcome.CALLBACK_REQUESTED,
  InteractionOutcome.NOT_INTERESTED,
  InteractionOutcome.MEETING_BOOKED,
  InteractionOutcome.VISIT_BOOKED,
  InteractionOutcome.VISIT_DONE,
  InteractionOutcome.OFFER_SENT,
  InteractionOutcome.NEGOTIATING,
  InteractionOutcome.RESERVED,
]);

export const STATS_CLAIM_KEYS = {
  pass: (tenantId: string, day: string) =>
    `stats:daily:pass:${tenantId}:${day}`,
  final: (tenantId: string, day: string, finalAt: Date) =>
    `stats:daily:final:${tenantId}:${day}:${finalAt.getTime()}`,
  backfill: (tenantId: string) => `stats:daily:backfill-lock:${tenantId}`,
  refresh: (tenantId: string, userId: string) =>
    `stats:daily:refresh:${tenantId}:${userId}`,
} as const;

export const backfillStateKey = (tenantId: string) =>
  `stats:daily:backfill:${tenantId}`;
