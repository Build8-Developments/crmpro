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
 * Agents see the leaderboard only when the workspace allows it
 * (showLeaderboardToAgents); people who manage others' leads (lead.read-all
 * or lead.read-team) always do.
 */
export function canSeeLeaderboard(
  showLeaderboardToAgents: boolean,
  scope: Pick<LeadScope, 'kind'>,
): boolean {
  return showLeaderboardToAgents || scope.kind !== 'own';
}

export const LEADERBOARD_TOP = 3;

/**
 * Rank by revenue (contracted this month), then deals; equal numbers share
 * a rank (1, 2, 2, 4). The top only lists people who sold something.
 */
export function rankLeaderboard(
  people: ReadonlyArray<{
    userId: string;
    name: string;
    revenue: number;
    deals: number;
  }>,
  meId: string,
  top = LEADERBOARD_TOP,
): Omit<LeaderboardView, 'period'> {
  const sorted = [...people].sort(
    (a, b) =>
      b.revenue - a.revenue ||
      b.deals - a.deals ||
      a.name.localeCompare(b.name),
  );
  const ranked: LeaderboardEntry[] = [];
  sorted.forEach((person, index) => {
    const previous = ranked[index - 1];
    const tied =
      previous &&
      previous.revenue === person.revenue &&
      previous.deals === person.deals;
    ranked.push({
      rank: tied ? previous.rank : index + 1,
      userId: person.userId,
      name: person.name,
      revenue: round2(person.revenue),
      deals: person.deals,
      isMe: person.userId === meId,
    });
  });
  return {
    participants: ranked.length,
    top: ranked
      .filter((entry) => entry.revenue > 0 || entry.deals > 0)
      .slice(0, top),
    me: ranked.find((entry) => entry.isMe) ?? null,
  };
}
