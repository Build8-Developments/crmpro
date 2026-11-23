import {
  LeadHeat,
  LeadStatus,
  Prisma,
  TaskPriority,
  TenantStatus,
} from '@crmpro/database';
import {
  addWorkingMinutes,
  atLocalTime,
  dayBoundsInZone,
  nextWorkingStart,
  type WorkSchedule,
} from '@crmpro/shared/workflow';

export const DAY_MS = 86_400_000;

export const ACTIVE_TENANT_STATUSES = [TenantStatus.ACTIVE, TenantStatus.TRIAL];

/** An open lead someone is (or should be) working. */
export const OPEN_LEAD: Prisma.LeadWhereInput = {
  deletedAt: null,
  status: LeadStatus.OPEN,
  pipelineStage: { isClosed: false },
};

/** Heat raises the priority of a suggested call (spec §3.3). */
export const PRIORITY_BY_HEAT: Record<LeadHeat, TaskPriority> = {
  HOT: TaskPriority.HIGH,
  WARM: TaskPriority.NORMAL,
  COLD: TaskPriority.LOW,
};

export const HEAT_RANK: Record<LeadHeat, number> = { HOT: 0, WARM: 1, COLD: 2 };

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Whole days from `from` to `to`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY_MS));
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/**
 * "Sometime today": the end of the working day that is running at `date`,
 * or of the next one when `date` is outside working hours.
 */
export function endOfWorkday(date: Date, schedule: WorkSchedule): Date {
  const start = nextWorkingStart(date, schedule);
  if (
    schedule.workingDays.length === 0 ||
    schedule.endMinute <= schedule.startMinute
  ) {
    // Always-open schedule: end of the calendar day.
    return new Date(
      dayBoundsInZone(start, schedule.timeZone).end.getTime() - 60_000,
    );
  }
  return atLocalTime(
    start,
    0,
    Math.floor(schedule.endMinute / 60),
    schedule.endMinute % 60,
    schedule.timeZone,
  );
}

/** `from` + `days` full working days (a working day = the configured hours). */
export function addWorkingDays(
  from: Date,
  days: number,
  schedule: WorkSchedule,
): Date {
  const minutesPerDay =
    schedule.endMinute > schedule.startMinute
      ? schedule.endMinute - schedule.startMinute
      : 24 * 60;
  return addWorkingMinutes(from, days * minutesPerDay, schedule);
}

/** How many more a person may get today under `cap`, given `used`. */
export function remaining(cap: number, used: number | undefined): number {
  return Math.max(0, cap - (used ?? 0));
}
