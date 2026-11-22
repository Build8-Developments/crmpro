import {
  InteractionChannel,
  InteractionOutcome,
  Prisma,
} from '@crmpro/database';
import {
  addWorkingMinutes,
  type WorkSchedule,
  workingMinutesBetween,
} from '@crmpro/shared/workflow';
import {
  ANSWERED_OUTCOMES,
  CALL_CHANNELS,
  STREAK_TASK_RATIO,
} from '../stats.constants';
import { addDays, weekdayOf } from './local-day.util';

/**
 * The counters of one `UserDailyStat` row and the pure rules that fill them.
 * Kept free of I/O so each rule is unit-tested on small fixtures.
 */

export const INT_COUNTER_KEYS = [
  'interactions',
  'calls',
  'whatsapps',
  'meetings',
  'visits',
  'answered',
  'tasksDue',
  'tasksDone',
  'tasksOverdue',
  'tasksSnoozed',
  'slaHits',
  'slaMisses',
  'firstResponseCount',
  'firstResponseMinutesTotal',
  'dealsReserved',
  'dealsContracted',
  'dealsCancelled',
] as const;

export type IntCounterKey = (typeof INT_COUNTER_KEYS)[number];

export type DailyCounters = Record<IntCounterKey, number> & {
  revenue: Prisma.Decimal;
  commission: Prisma.Decimal;
};

export function emptyCounters(): DailyCounters {
  const counters = Object.fromEntries(
    INT_COUNTER_KEYS.map((key) => [key, 0]),
  ) as Record<IntCounterKey, number>;
  return {
    ...counters,
    revenue: new Prisma.Decimal(0),
    commission: new Prisma.Decimal(0),
  };
}

export function isAllZero(counters: DailyCounters): boolean {
  return (
    INT_COUNTER_KEYS.every((key) => counters[key] === 0) &&
    counters.revenue.isZero() &&
    counters.commission.isZero()
  );
}

/** Counters per user, created on first touch. */
export class CounterBook {
  private readonly byUser = new Map<string, DailyCounters>();

  for(userId: string): DailyCounters {
    let counters = this.byUser.get(userId);
    if (!counters) {
      counters = emptyCounters();
      this.byUser.set(userId, counters);
    }
    return counters;
  }

  entries(): [string, DailyCounters][] {
    return [...this.byUser.entries()];
  }
}

// ─── Interactions ──────────────────────────────────────────────────────────

export interface InteractionGroup {
  channel: InteractionChannel;
  outcome: InteractionOutcome;
  count: number;
}

/**
 * One (channel, outcome) bucket of a user's interactions that day. A site
 * visit is counted once whether it was logged as the SITE_VISIT channel, a
 * VISIT_DONE outcome, or both.
 */
export function addInteractionGroup(
  counters: DailyCounters,
  group: InteractionGroup,
): void {
  const { channel, outcome, count } = group;
  counters.interactions += count;
  if (CALL_CHANNELS.has(channel)) counters.calls += count;
  if (channel === InteractionChannel.WHATSAPP) counters.whatsapps += count;
  if (channel === InteractionChannel.MEETING) counters.meetings += count;
  if (
    channel === InteractionChannel.SITE_VISIT ||
    outcome === InteractionOutcome.VISIT_DONE
  ) {
    counters.visits += count;
  }
  if (ANSWERED_OUTCOMES.has(outcome)) counters.answered += count;
}

// ─── First-contact SLA ─────────────────────────────────────────────────────

export interface SlaLead {
  assignedAt: Date;
  firstContactedAt: Date | null;
  slaBreachedAt: Date | null;
  closedAt: Date | null;
}

export interface SlaContext {
  dayStart: Date;
  dayEnd: Date;
  now: Date;
  firstContactSlaMinutes: number;
  schedule: WorkSchedule;
}

/**
 * The deadline of the current assignment: assignedAt + SLA in working minutes
 * (same math as rule R1). A breach stamped during this assignment is the
 * deadline the rules engine used, so it wins over a recomputation with
 * settings that may have changed since.
 */
export function slaDeadline(lead: SlaLead, ctx: SlaContext): Date {
  if (lead.slaBreachedAt && lead.slaBreachedAt >= lead.assignedAt) {
    return lead.slaBreachedAt;
  }
  return addWorkingMinutes(
    lead.assignedAt,
    ctx.firstContactSlaMinutes,
    ctx.schedule,
  );
}

/**
 * Hit / miss for a lead whose deadline falls on the day, null otherwise.
 * - Leads already contacted before this assignment have no SLA (R1 never
 *   ran for the new owner).
 * - miss: breach stamped for this assignment, first contact after the
 *   deadline, or no contact once the deadline has passed (unless the lead
 *   was closed before it).
 * - hit: first contact at or before the deadline (known as soon as it
 *   happens).
 * - pending (deadline not passed, no contact yet): not counted.
 */
export function classifySla(
  lead: SlaLead,
  ctx: SlaContext,
): 'hit' | 'miss' | null {
  if (lead.firstContactedAt && lead.firstContactedAt < lead.assignedAt) {
    return null;
  }
  const deadline = slaDeadline(lead, ctx);
  if (deadline < ctx.dayStart || deadline >= ctx.dayEnd) return null;

  if (lead.slaBreachedAt && lead.slaBreachedAt >= lead.assignedAt) {
    return 'miss';
  }
  if (lead.firstContactedAt) {
    return lead.firstContactedAt <= deadline ? 'hit' : 'miss';
  }
  if (deadline > ctx.now) return null;
  if (lead.closedAt && lead.closedAt <= deadline) return null;
  return 'miss';
}

// ─── First response ────────────────────────────────────────────────────────

export interface FirstResponseLead {
  assignedUserId: string;
  assignedAt: Date;
  firstContactedAt: Date;
  /** Author of the earliest interaction on the lead. */
  firstInteractionUserId: string | null;
}

/**
 * Working minutes from assignment to the first touch, when the assignee made
 * it during their own assignment; null otherwise (someone else reached the
 * client, or the lead was reassigned after the first touch).
 */
export function firstResponseMinutes(
  lead: FirstResponseLead,
  schedule: WorkSchedule,
): number | null {
  if (lead.firstContactedAt < lead.assignedAt) return null;
  if (lead.firstInteractionUserId !== lead.assignedUserId) return null;
  return workingMinutesBetween(
    lead.assignedAt,
    lead.firstContactedAt,
    schedule,
  );
}

// ─── Streak ────────────────────────────────────────────────────────────────

export interface StreakDay {
  tasksDue: number;
  tasksDone: number;
  interactions: number;
}

export interface StreakInput {
  /** The caller's local today. */
  today: string;
  /** Rows by local day; a missing day had no activity and nothing due. */
  days: ReadonlyMap<string, StreakDay>;
  workingDays: readonly number[];
  dailyInteractionGoal: number;
  lookbackDays: number;
}

/**
 * A day counts for the streak when ≥ 80% of the tasks due were done, or — on
 * a day with nothing due — the daily interaction goal was reached.
 */
export function qualifiesForStreak(
  row: StreakDay,
  dailyInteractionGoal: number,
): boolean {
  return row.tasksDue > 0
    ? row.tasksDone >= STREAK_TASK_RATIO * row.tasksDue
    : row.interactions >= dailyInteractionGoal;
}

/**
 * Consecutive working days on which the agent did the work:
 * - a day with tasks due qualifies when tasksDone ≥ 80% of tasksDue;
 * - a day with nothing due qualifies with ≥ dailyInteractionGoal interactions.
 * Non-working days are skipped. A working day with no row at all (no
 * activity, nothing due, nothing overdue — a public holiday or leave) neither
 * counts nor breaks the streak. Today counts once it qualifies and never
 * breaks it (the day is not over).
 */
export function computeStreak(input: StreakInput): number {
  const alwaysWorking = input.workingDays.length === 0;
  let streak = 0;
  for (let offset = 0; offset <= input.lookbackDays; offset += 1) {
    const day = addDays(input.today, -offset);
    if (!alwaysWorking && !input.workingDays.includes(weekdayOf(day))) {
      continue;
    }
    const row = input.days.get(day);
    if (!row) continue;
    const qualifies = qualifiesForStreak(row, input.dailyInteractionGoal);
    if (offset === 0) {
      if (qualifies) streak += 1;
      continue;
    }
    if (!qualifies) break;
    streak += 1;
  }
  return streak;
}
