import type { LeaderboardMode, TargetMetric } from '@crmpro/database';
import { FAST_FIRST_CONTACT_MINUTES } from '@crmpro/shared/achievements';
import { addWorkingMinutes, type WorkSchedule } from '@crmpro/shared/workflow';
import type { LeadScope } from '../../../common/auth';
import { periodOf } from '../../../common/utils/month-period.util';
import type { DealFact, LeadFact } from '../achievements/achievement-sources';
import {
  isFastFirstContact,
  weekStartOf,
} from '../achievements/achievement-sources';
import { localDayOf } from '../utils/local-day.util';
import type {
  LeaderboardEntry,
  LeaderboardView,
  MonthPoint,
  PeriodBest,
  VisibleLeaderboardMode,
} from './performance.types';

/**
 * Pure rules behind "My performance" (spec §4.1): month series, personal
 * bests and the leaderboard. Months and weeks are in the workspace time zone.
 */

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Deals (by reservation month) and revenue (contracted price, by contract
 * month) for each of `periods`, in the given order.
 */
export function monthlySeries(
  deals: readonly DealFact[],
  periods: readonly string[],
  timeZone: string,
): MonthPoint[] {
  const points = new Map<string, MonthPoint>(
    periods.map((period) => [period, { period, deals: 0, revenue: 0 }]),
  );
  for (const deal of deals) {
    const reserved = points.get(periodOf(deal.reservedAt, timeZone));
    if (reserved) reserved.deals += 1;
    if (deal.contractedAt) {
      const contracted = points.get(periodOf(deal.contractedAt, timeZone));
      if (contracted) contracted.revenue += deal.price;
    }
  }
  return periods.map((period) => {
    const point = points.get(period) as MonthPoint;
    return { ...point, revenue: round2(point.revenue) };
  });
}

/** The month with the most revenue / deals ever; earliest wins a tie. */
export function bestMonth(
  deals: readonly DealFact[],
  metric: 'revenue' | 'deals',
  timeZone: string,
): PeriodBest | null {
  const totals = new Map<string, number>();
  for (const deal of deals) {
    if (metric === 'deals') {
      const period = periodOf(deal.reservedAt, timeZone);
      totals.set(period, (totals.get(period) ?? 0) + 1);
    } else if (deal.contractedAt) {
      const period = periodOf(deal.contractedAt, timeZone);
      totals.set(period, (totals.get(period) ?? 0) + deal.price);
    }
  }
  let best: PeriodBest | null = null;
  for (const period of [...totals.keys()].sort()) {
    const value = round2(totals.get(period) ?? 0);
    if (value > 0 && (!best || value > best.value)) best = { period, value };
  }
  return best;
}

/**
 * Longest run of consecutive leads (in the order they were assigned to the
 * user) first contacted within FAST_FIRST_CONTACT_MINUTES working minutes.
 * - a lead reached later, or not reached once that time has passed, ends
 *   the run;
 * - a lead still inside its window, closed before it without a contact, or
 *   touched before this assignment is skipped (neither counts nor breaks).
 */
export function fastContactStreak(
  leads: readonly LeadFact[],
  schedule: WorkSchedule,
  now: Date,
): { best: number; current: number } {
  const assigned = leads
    .filter(
      (lead): lead is LeadFact & { assignedAt: Date } => !!lead.assignedAt,
    )
    .sort((a, b) => a.assignedAt.getTime() - b.assignedAt.getTime());
  let best = 0;
  let current = 0;
  for (const lead of assigned) {
    if (lead.firstContactedAt && lead.firstContactedAt < lead.assignedAt) {
      continue;
    }
    if (!lead.firstContactedAt) {
      const deadline = addWorkingMinutes(
        lead.assignedAt,
        FAST_FIRST_CONTACT_MINUTES,
        schedule,
      );
      if (deadline > now) continue;
      if (lead.closedAt && lead.closedAt <= deadline) continue;
      current = 0;
      continue;
    }
    if (isFastFirstContact(lead, schedule)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return { best, current };
}

/** The week (by the workspace week start) with the most visits. */
export function mostVisitsInWeek(
  visits: readonly Date[],
  timeZone: string,
  weekStartsOn: number,
): { weekStart: string; value: number } | null {
  const weeks = new Map<string, number>();
  for (const at of visits) {
    const week = weekStartOf(localDayOf(at, timeZone), weekStartsOn);
    weeks.set(week, (weeks.get(week) ?? 0) + 1);
  }
  let best: { weekStart: string; value: number } | null = null;
  for (const weekStart of [...weeks.keys()].sort()) {
    const value = weeks.get(weekStart) ?? 0;
    if (!best || value > best.value) best = { weekStart, value };
  }
  return best;
}

/**
 * The leaderboard mode the caller gets, or null when hidden. Agents follow
 * the workspace setting; people who manage others' leads (lead.read-all or
 * lead.read-team) still see it when it is OFF for agents, as % of target.
 */
export function effectiveLeaderboardMode(
  mode: LeaderboardMode,
  scope: Pick<LeadScope, 'kind'>,
): VisibleLeaderboardMode | null {
  if (mode !== 'OFF') return mode;
  return scope.kind === 'own' ? null : 'TARGET_PERCENT';
}

export const LEADERBOARD_TOP = 3;
/** One target can count for at most 150%, so one big sale can't carry the score. */
export const TARGET_RATIO_CAP = 1.5;

/**
 * Average share of a person's own targets reached this month, as a whole
 * percent (each target capped at TARGET_RATIO_CAP). Null without targets.
 */
export function targetAttainment(
  targets: ReadonlyArray<{ metric: TargetMetric; value: number }>,
  actuals: Partial<Record<TargetMetric, number>> | undefined,
): number | null {
  const ratios = targets
    .filter((target) => target.value > 0)
    .map((target) =>
      Math.min(
        (actuals?.[target.metric] ?? 0) / target.value,
        TARGET_RATIO_CAP,
      ),
    );
  if (ratios.length === 0) return null;
  const mean = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return Math.round(mean * 100);
}

export interface LeaderboardPerson {
  userId: string;
  name: string;
  showOnLeaderboard: boolean;
  revenue: number;
  deals: number;
  targetPercent: number | null;
}

/**
 * Ranks people and keeps only what the mode allows. FULL ranks by revenue
 * then deals (everyone who can sell); the other modes rank by % of target
 * (people with a target). Equal scores share a rank (1, 2, 2, 4). The top
 * lists people with a score above zero. Someone who opted out appears as
 * "A teammate" (no id, no name) — except to themselves.
 */
export function rankLeaderboard(
  people: readonly LeaderboardPerson[],
  meId: string,
  mode: VisibleLeaderboardMode,
  top = LEADERBOARD_TOP,
): Omit<LeaderboardView, 'period' | 'mode' | 'recentWins'> {
  const byMoney = mode === 'FULL';
  const pool = byMoney
    ? [...people]
    : people.filter((person) => person.targetPercent !== null);
  const score = (person: LeaderboardPerson): [number, number] =>
    byMoney ? [person.revenue, person.deals] : [person.targetPercent ?? 0, 0];

  pool.sort((a, b) => {
    const [a1, a2] = score(a);
    const [b1, b2] = score(b);
    return b1 - a1 || b2 - a2 || a.name.localeCompare(b.name);
  });

  const ranks: number[] = [];
  pool.forEach((person, index) => {
    const previous = pool[index - 1];
    const tied =
      previous !== undefined &&
      score(previous)[0] === score(person)[0] &&
      score(previous)[1] === score(person)[1];
    ranks.push(tied ? ranks[index - 1] : index + 1);
  });

  const entryFor = (
    person: LeaderboardPerson,
    rank: number,
  ): LeaderboardEntry => {
    const isMe = person.userId === meId;
    const named = isMe || person.showOnLeaderboard;
    const entry: LeaderboardEntry = {
      rank,
      userId: named ? person.userId : null,
      name: named ? person.name : null,
      anonymous: !named,
      isMe,
    };
    if (byMoney) {
      entry.revenue = round2(person.revenue);
      entry.deals = person.deals;
    }
    // Your own % is always yours to see; others' only in TARGET_PERCENT.
    if (person.targetPercent !== null && (mode === 'TARGET_PERCENT' || isMe)) {
      entry.targetPercent = person.targetPercent;
    }
    return entry;
  };

  const entries = pool.map((person, index) => entryFor(person, ranks[index]));
  const scored = pool.map(
    (person) => score(person)[0] > 0 || score(person)[1] > 0,
  );
  const meIndex = pool.findIndex((person) => person.userId === meId);
  const meListed = people.find((person) => person.userId === meId);

  return {
    participants: entries.length,
    top: entries.filter((_, index) => scored[index]).slice(0, top),
    me: meIndex >= 0 ? entries[meIndex] : null,
    meHasNoTarget:
      !byMoney && meListed !== undefined && meListed.targetPercent === null,
  };
}
