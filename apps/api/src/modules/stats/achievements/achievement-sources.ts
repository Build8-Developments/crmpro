import {
  ACHIEVEMENT_KEYS,
  type AchievementKey,
  FAST_FIRST_CONTACT_MINUTES,
  isReferralSourceName,
} from '@crmpro/shared/achievements';
import { addWorkingMinutes, type WorkSchedule } from '@crmpro/shared/workflow';
import { qualifiesForStreak, type StreakDay } from '../utils/daily-counters';
import { addDays, localDayBounds, weekdayOf } from '../utils/local-day.util';
import {
  cumulative,
  type MetricTimeline,
  ratio,
  type TimelineEvent,
} from './achievement-timeline';

/**
 * The records one user's badges are computed from, already loaded, and the
 * pure rules that turn them into timelines. Money is in the workspace
 * currency; days are local days in the workspace time zone.
 */

/** A deal credited to the user, not cancelled, on a live lead. */
export interface DealFact {
  reservedAt: Date;
  /** Set when the deal is contracted (status CONTRACTED). */
  contractedAt: Date | null;
  price: number;
  commission: number;
  sourceName: string | null;
}

/** A live lead currently assigned to the user. */
export interface LeadFact {
  assignedAt: Date | null;
  firstContactedAt: Date | null;
  closedAt: Date | null;
  /** From the lead's current stage. */
  closeType: 'WON' | 'LOST' | null;
}

/** One UserDailyStat row (only the counters badges use). */
export interface DayFact extends StreakDay {
  /** Local day, YYYY-MM-DD. */
  day: string;
  tasksOverdue: number;
}

export interface AchievementCalendar {
  timeZone: string;
  /** 0 = Sunday … 6 = Saturday. */
  weekStartsOn: number;
  schedule: WorkSchedule;
  dailyInteractionGoal: number;
}

export interface AchievementInputs {
  deals: DealFact[];
  leads: LeadFact[];
  days: DayFact[];
  calendar: AchievementCalendar;
}

/** First local day of the week containing `day`. */
export function weekStartOf(day: string, weekStartsOn: number): string {
  return addDays(day, -((weekdayOf(day) - weekStartsOn + 7) % 7));
}

/**
 * True when the assignee first reached the lead within
 * FAST_FIRST_CONTACT_MINUTES working minutes of getting it. Leads touched
 * before their current assignment don't count (someone else's first touch).
 */
export function isFastFirstContact(
  lead: Pick<LeadFact, 'assignedAt' | 'firstContactedAt'>,
  schedule: WorkSchedule,
): boolean {
  if (!lead.assignedAt || !lead.firstContactedAt) return false;
  if (lead.firstContactedAt < lead.assignedAt) return false;
  const deadline = addWorkingMinutes(
    lead.assignedAt,
    FAST_FIRST_CONTACT_MINUTES,
    schedule,
  );
  return lead.firstContactedAt <= deadline;
}

/** Deals: one per deal at its reservation. */
export function dealsTimeline(deals: readonly DealFact[]): MetricTimeline {
  return cumulative(deals.map((deal) => ({ at: deal.reservedAt, amount: 1 })));
}

/** Revenue: contracted price, at the contract. */
export function revenueTimeline(deals: readonly DealFact[]): MetricTimeline {
  return cumulative(
    deals
      .filter((deal) => deal.contractedAt !== null)
      .map((deal) => ({ at: deal.contractedAt as Date, amount: deal.price })),
  );
}

/** Referral magnet: deals on leads whose source is a client referral. */
export function referralTimeline(deals: readonly DealFact[]): MetricTimeline {
  return cumulative(
    deals
      .filter((deal) => isReferralSourceName(deal.sourceName))
      .map((deal) => ({ at: deal.reservedAt, amount: 1 })),
  );
}

/** Speed demon: leads first contacted fast, at the first contact. */
export function speedTimeline(
  leads: readonly LeadFact[],
  schedule: WorkSchedule,
): MetricTimeline {
  return cumulative(
    leads
      .filter((lead) => isFastFirstContact(lead, schedule))
      .map((lead) => ({ at: lead.firstContactedAt as Date, amount: 1 })),
  );
}

/** Closer: won vs lost over the user's closed leads, at the close. */
export function winRateTimeline(leads: readonly LeadFact[]): MetricTimeline {
  return ratio(
    leads
      .filter((lead) => lead.closedAt !== null && lead.closeType !== null)
      .map((lead) => ({
        at: lead.closedAt as Date,
        success: lead.closeType === 'WON',
      })),
  );
}

/**
 * Zero overdue week: complete weeks (by the workspace week start) with tasks
 * due and no task left overdue at the end of any day. Counted when the
 * week ends; the current week never counts.
 */
export function cleanWeeksTimeline(
  days: readonly DayFact[],
  calendar: Pick<AchievementCalendar, 'timeZone' | 'weekStartsOn'>,
  now: Date,
): MetricTimeline {
  const weeks = new Map<string, { due: number; overdue: number }>();
  for (const row of days) {
    const start = weekStartOf(row.day, calendar.weekStartsOn);
    const week = weeks.get(start) ?? { due: 0, overdue: 0 };
    week.due += row.tasksDue;
    week.overdue += row.tasksOverdue;
    weeks.set(start, week);
  }
  const events: TimelineEvent[] = [];
  for (const [start, week] of weeks) {
    if (week.due === 0 || week.overdue > 0) continue;
    const end = localDayBounds(addDays(start, 6), calendar.timeZone).end;
    if (end > now) continue;
    events.push({ at: end, amount: 1 });
  }
  return cumulative(events);
}

/**
 * The longest streak so far, day by day, with the same rule as the Today
 * streak (computeStreak): working days only, a day with no row neither counts
 * nor breaks, today counts once it qualifies and never breaks. Each time the
 * record grows by one, an event is placed at the end of that day (or now).
 */
export function bestStreakTimeline(
  days: readonly DayFact[],
  calendar: Pick<
    AchievementCalendar,
    'timeZone' | 'dailyInteractionGoal' | 'schedule'
  >,
  today: string,
  now: Date,
): MetricTimeline {
  const byDay = new Map(days.map((row) => [row.day, row]));
  const ordered = [...byDay.keys()].filter((day) => day <= today).sort();
  if (ordered.length === 0) return cumulative([]);

  const workingDays = calendar.schedule.workingDays;
  const alwaysWorking = workingDays.length === 0;
  const events: TimelineEvent[] = [];
  let current = 0;
  let best = 0;
  for (let day = ordered[0]; day <= today; day = addDays(day, 1)) {
    if (!alwaysWorking && !workingDays.includes(weekdayOf(day))) continue;
    const row = byDay.get(day);
    if (!row) continue;
    if (!qualifiesForStreak(row, calendar.dailyInteractionGoal)) {
      if (day !== today) current = 0;
      continue;
    }
    current += 1;
    if (current > best) {
      best = current;
      const end = localDayBounds(day, calendar.timeZone).end;
      events.push({ at: end < now ? end : now, amount: 1 });
    }
  }
  return cumulative(events);
}

/** Every catalog badge's timeline for one user. */
export function buildTimelines(
  inputs: AchievementInputs,
  today: string,
  now: Date,
): Record<AchievementKey, MetricTimeline> {
  const { deals, leads, days, calendar } = inputs;
  return {
    [ACHIEVEMENT_KEYS.DEALS]: dealsTimeline(deals),
    [ACHIEVEMENT_KEYS.REVENUE]: revenueTimeline(deals),
    [ACHIEVEMENT_KEYS.SPEED_DEMON]: speedTimeline(leads, calendar.schedule),
    [ACHIEVEMENT_KEYS.ZERO_OVERDUE_WEEK]: cleanWeeksTimeline(
      days,
      calendar,
      now,
    ),
    [ACHIEVEMENT_KEYS.STREAK]: bestStreakTimeline(days, calendar, today, now),
    [ACHIEVEMENT_KEYS.REFERRAL_MAGNET]: referralTimeline(deals),
    [ACHIEVEMENT_KEYS.CLOSER]: winRateTimeline(leads),
  };
}
