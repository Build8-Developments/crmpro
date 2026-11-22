import { LeadStatus, Prisma } from '@crmpro/database';
import type { PrismaService } from '../../../common/prisma/prisma.service';
import type {
  LeadLastContactFilter,
  LeadNextStepFilter,
  LeadStageThreshold,
  LeadStageThresholds,
} from '../types/lead.types';

/**
 * Lead where-fragments shared by the leads list (filters in the URL) and the
 * dashboard counts that link to it, so a number and the list behind it always
 * use the same condition. Every function is pure: callers pass `now`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Matches no lead (a filter whose rule is off everywhere). */
const NO_LEAD: Prisma.LeadWhereInput = { id: { in: [] } };

/** Open status in an open (not won/lost) stage. */
export const OPEN_LEAD_WHERE = {
  status: LeadStatus.OPEN,
  pipelineStage: { isClosed: false },
} satisfies Prisma.LeadWhereInput;

/** Hours after which a hot lead counts as untouched on the dashboard. */
export const HOT_UNTOUCHED_HOURS = 48;
/** The `lastContact` list filter that matches {@link HOT_UNTOUCHED_HOURS}. */
export const HOT_UNTOUCHED_LAST_CONTACT: LeadLastContactFilter = 'over_2d';

function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/** `never`, or not contacted for over N days (never contacted included). */
export function lastContactWhere(
  lastContact: LeadLastContactFilter,
  now: Date,
): Prisma.LeadWhereInput {
  if (lastContact === 'never') return { lastContactedAt: null };
  const days = Number(lastContact.replace('over_', '').replace('d', ''));
  return {
    OR: [
      { lastContactedAt: { lt: daysBefore(now, days) } },
      { lastContactedAt: null },
    ],
  };
}

/** Next-step filters only make sense for open leads. */
export function nextStepWhere(
  nextStep: LeadNextStepFilter,
  now: Date,
  todayBounds: { start: Date; end: Date },
): Prisma.LeadWhereInput {
  switch (nextStep) {
    case 'none':
      return { ...OPEN_LEAD_WHERE, nextTaskDueAt: null };
    case 'overdue':
      return { ...OPEN_LEAD_WHERE, nextTaskDueAt: { lt: now } };
    case 'today':
      return {
        ...OPEN_LEAD_WHERE,
        nextTaskDueAt: { gte: todayBounds.start, lt: todayBounds.end },
      };
    case 'scheduled':
      return { ...OPEN_LEAD_WHERE, nextTaskDueAt: { gte: now } };
  }
}

/** First-contact SLA missed during the given (local) day. */
export function slaBreachedWhere(bounds: {
  start: Date;
  end: Date;
}): Prisma.LeadWhereInput {
  return { slaBreachedAt: { gte: bounds.start, lt: bounds.end } };
}

/** Open and waiting for an owner. */
export const UNASSIGNED_OPEN_LEAD_WHERE = {
  ...OPEN_LEAD_WHERE,
  assignedUserId: null,
} satisfies Prisma.LeadWhereInput;

/** Has an owner (any). */
export const ASSIGNED_LEAD_WHERE = {
  assignedUserId: { not: null },
} satisfies Prisma.LeadWhereInput;

/**
 * R9 — open leads in their stage longer than the stage's `stuckAfterDays`
 * (by `stageEnteredAt`). Stages without a threshold are off.
 */
export function stuckLeadWhere(
  stages: LeadStageThreshold[],
  now: Date,
): Prisma.LeadWhereInput {
  if (stages.length === 0) return NO_LEAD;
  return {
    ...OPEN_LEAD_WHERE,
    OR: stages.map((stage) => ({
      pipelineStageId: stage.id,
      stageEnteredAt: { lt: daysBefore(now, stage.days) },
    })),
  };
}

/**
 * R8 — open leads with no contact for their stage's `staleAfterDays`. Leads
 * never contacted count from their creation (same as the 7-day `staleOnly`).
 */
export function stageStaleLeadWhere(
  stages: LeadStageThreshold[],
  now: Date,
): Prisma.LeadWhereInput {
  if (stages.length === 0) return NO_LEAD;
  return {
    ...OPEN_LEAD_WHERE,
    OR: stages.map((stage) => {
      const cutoff = daysBefore(now, stage.days);
      return {
        pipelineStageId: stage.id,
        OR: [
          { lastContactedAt: { lt: cutoff } },
          { lastContactedAt: null, createdAt: { lt: cutoff } },
        ],
      };
    }),
  };
}

export interface LeadStageThresholdRow {
  id: string;
  name: string;
  pipelineId: string;
  pipelineName: string;
  stuckAfterDays: number | null;
  staleAfterDays: number | null;
}

/** Splits the open stages' R8/R9 settings into the two threshold lists. */
export function toStageThresholds(
  rows: LeadStageThresholdRow[],
): LeadStageThresholds {
  return {
    stuck: rows
      .filter((row) => row.stuckAfterDays !== null)
      .map((row) => ({ id: row.id, days: row.stuckAfterDays! })),
    stale: rows
      .filter((row) => row.staleAfterDays !== null)
      .map((row) => ({ id: row.id, days: row.staleAfterDays! })),
  };
}

/** Open stages of the tenant that have a stuck or stale threshold. */
export async function loadStageThresholdRows(
  prisma: Pick<PrismaService, 'pipelineStage'>,
  tenantId: string,
): Promise<LeadStageThresholdRow[]> {
  const stages = await prisma.pipelineStage.findMany({
    where: {
      tenantId,
      isClosed: false,
      OR: [
        { stuckAfterDays: { not: null } },
        { staleAfterDays: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      pipelineId: true,
      stuckAfterDays: true,
      staleAfterDays: true,
      pipeline: { select: { name: true } },
    },
    orderBy: [{ pipelineId: 'asc' }, { sortOrder: 'asc' }],
  });
  return stages.map(({ pipeline, ...stage }) => ({
    ...stage,
    pipelineName: pipeline.name,
  }));
}
