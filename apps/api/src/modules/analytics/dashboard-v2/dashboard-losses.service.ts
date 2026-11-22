import { Injectable } from '@nestjs/common';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  monthBounds,
  periodOf,
  shiftPeriod,
} from '../../../common/utils/month-period.util';
import { RULE_KEYS } from '../../workflow/rules/rule-keys';
import {
  buildLeadScopeSql,
  leadRelationScope,
} from '../queries/analytics-scope.util';
import { PipelineAnalyticsService } from '../services/pipeline-analytics.service';
import type { DashboardPeriod } from './dashboard-period';
import type {
  DashboardLossesResponse,
  DashboardLossesStage,
  DashboardStageDuration,
  DashboardWonBackLead,
} from './dashboard-losses.types';
import {
  buildBreakdown,
  buildCohorts,
  type CohortBucket,
  percent,
} from './dashboard-losses.util';

/** Created-month cohorts shown, the current month included. */
export const LOSSES_COHORT_MONTHS = 6;
const BREAKDOWN_LIMIT = 12;
const WON_BACK_LIST_LIMIT = 10;
const NO_REASON = 'No reason given';
const NO_SOURCE = 'No source';
const UNASSIGNED = 'Unassigned';

interface PipelineStages {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
    sortOrder: number;
    closeType: 'WON' | 'LOST' | null;
  }>;
}

/**
 * §5.5 "Where do we lose?" — all on the default pipeline (stages differ per
 * pipeline), scoped to the caller's leads.
 *
 * - Conversion by cohort: leads created in each of the last six months and
 *   the share that reached each step (see `buildCohorts` for the rules).
 *   Cohorts follow the calendar, not the period selector.
 * - Days per stage: stints that ended (the lead moved on) in the period,
 *   from STAGE_CHANGED history; a stint starts at the previous change or at
 *   creation. Open stints are left out (the funnel already shows how long
 *   current leads have been sitting).
 * - Lost reasons: leads now in a LOST stage that closed in the period
 *   (`closedAt`, or `stageEnteredAt` for rows closed before it existed), by
 *   reason, by source and by current owner.
 * - Won back: leads moved into a WON stage in the period after an earlier
 *   move into a LOST stage; flagged when a R12 re-engage task was created on
 *   the lead between the two.
 */
@Injectable()
export class DashboardLossesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipelineAnalytics: PipelineAnalyticsService,
  ) {}

  async get(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardLossesResponse> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        stages: {
          select: { id: true, name: true, sortOrder: true, closeType: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    const [history, lost, wonBack, funnel] = await Promise.all([
      pipeline
        ? this.history(tenantId, scope, period, pipeline)
        : Promise.resolve({
            funnelStages: [],
            cohorts: [],
            stageDurations: [],
          }),
      this.lostReasons(tenantId, scope, period),
      this.wonBack(tenantId, scope, period),
      this.pipelineAnalytics.getPipeline(tenantId, scope),
    ]);

    return {
      period: {
        key: period.key,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        timeZone: period.timeZone,
      },
      pipeline: pipeline ? { id: pipeline.id, name: pipeline.name } : null,
      ...history,
      lost,
      wonBack,
      funnel,
    };
  }

  // ─── Conversion and days per stage ────────────────────────────────────

  private async history(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
    pipeline: PipelineStages,
  ): Promise<
    Pick<DashboardLossesResponse, 'funnelStages' | 'cohorts' | 'stageDurations'>
  > {
    const openStages = pipeline.stages.filter((stage) => !stage.closeType);
    const wonStage = pipeline.stages.find((stage) => stage.closeType === 'WON');
    const funnelStages: DashboardLossesStage[] = [
      ...openStages.map((stage) => ({
        stageId: stage.id,
        name: stage.name,
        sortOrder: stage.sortOrder,
        closeType: null,
      })),
      ...(wonStage
        ? [
            {
              stageId: wonStage.id,
              name: wonStage.name,
              sortOrder: wonStage.sortOrder,
              closeType: 'WON' as const,
            },
          ]
        : []),
    ];

    const current = periodOf(period.now, period.timeZone);
    const months = Array.from({ length: LOSSES_COHORT_MONTHS }, (_, index) =>
      shiftPeriod(current, index - (LOSSES_COHORT_MONTHS - 1)),
    );
    const cohortStart = monthBounds(months[0], period.timeZone).start;
    const scopeSql = buildLeadScopeSql(scope);

    const [buckets, durations] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          month: string;
          maxOpenSort: number | null;
          won: boolean;
          count: number;
        }>
      >`
        WITH cohort AS (
          SELECT l."id",
                 to_char((l."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${period.timeZone}, 'YYYY-MM') AS "month",
                 l."pipelineStageId"::text AS "stageId"
          FROM "Lead" l
          WHERE l."tenantId" = ${tenantId}::uuid
            AND l."deletedAt" IS NULL
            AND l."pipelineId" = ${pipeline.id}::uuid
            AND l."createdAt" >= ${cohortStart}
            AND l."createdAt" < ${period.now}
            AND ${scopeSql}
        ),
        touched AS (
          SELECT c."id", c."month", c."stageId" FROM cohort c
          UNION ALL
          SELECT c."id", c."month", moved."stageId"
          FROM cohort c
          JOIN "LeadActivity" la
            ON la."leadId" = c."id" AND la."eventType" = 'STAGE_CHANGED'
          CROSS JOIN LATERAL (
            VALUES (la."metadata"->>'fromStageId'), (la."metadata"->>'toStageId')
          ) AS moved("stageId")
        ),
        per_lead AS (
          SELECT t."id", t."month",
                 MAX(s."sortOrder") FILTER (WHERE s."closeType" IS NULL) AS "maxOpenSort",
                 COALESCE(BOOL_OR(s."closeType" = 'WON'), FALSE) AS "won"
          FROM touched t
          LEFT JOIN "PipelineStage" s
            ON s."id"::text = t."stageId" AND s."pipelineId" = ${pipeline.id}::uuid
          GROUP BY t."id", t."month"
        )
        SELECT "month", "maxOpenSort", "won", COUNT(*)::int AS "count"
        FROM per_lead
        GROUP BY 1, 2, 3
      `,
      this.prisma.$queryRaw<
        Array<{
          stageId: string;
          avgDays: number | null;
          medianDays: number | null;
          exits: number;
        }>
      >`
        WITH moves AS (
          SELECT la."leadId",
                 la."createdAt" AS "endedAt",
                 la."metadata"->>'fromStageId' AS "stageId",
                 COALESCE(
                   LAG(la."createdAt") OVER (PARTITION BY la."leadId" ORDER BY la."createdAt"),
                   l."createdAt"
                 ) AS "startedAt"
          FROM "LeadActivity" la
          JOIN "Lead" l ON l."id" = la."leadId"
          WHERE la."tenantId" = ${tenantId}::uuid
            AND la."eventType" = 'STAGE_CHANGED'
            AND l."tenantId" = ${tenantId}::uuid
            AND l."deletedAt" IS NULL
            AND l."pipelineId" = ${pipeline.id}::uuid
            AND ${scopeSql}
            AND la."leadId" IN (
              SELECT recent."leadId" FROM "LeadActivity" recent
              WHERE recent."tenantId" = ${tenantId}::uuid
                AND recent."eventType" = 'STAGE_CHANGED'
                AND recent."createdAt" >= ${period.from}
                AND recent."createdAt" < ${period.to}
            )
        )
        SELECT m."stageId",
               AVG(EXTRACT(EPOCH FROM (m."endedAt" - m."startedAt")) / 86400.0)::float8 AS "avgDays",
               percentile_cont(0.5) WITHIN GROUP (
                 ORDER BY EXTRACT(EPOCH FROM (m."endedAt" - m."startedAt")) / 86400.0
               )::float8 AS "medianDays",
               COUNT(*)::int AS "exits"
        FROM moves m
        WHERE m."endedAt" >= ${period.from}
          AND m."endedAt" < ${period.to}
          AND m."endedAt" >= m."startedAt"
        GROUP BY m."stageId"
      `,
    ]);

    const durationBy = new Map(durations.map((row) => [row.stageId, row]));
    const stageDurations: DashboardStageDuration[] = openStages.map((stage) => {
      const row = durationBy.get(stage.id);
      return {
        stageId: stage.id,
        name: stage.name,
        avgDays: roundDays(row?.avgDays),
        medianDays: roundDays(row?.medianDays),
        exits: row?.exits ?? 0,
      };
    });

    return {
      funnelStages,
      cohorts: buildCohorts(
        months,
        funnelStages,
        buckets.map(
          (row): CohortBucket => ({
            month: row.month,
            maxOpenSort:
              row.maxOpenSort === null ? null : Number(row.maxOpenSort),
            won: Boolean(row.won),
            count: Number(row.count),
          }),
        ),
      ),
      stageDurations,
    };
  }

  // ─── Lost reasons ──────────────────────────────────────────────────────

  private async lostReasons(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardLossesResponse['lost']> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        reasonId: string | null;
        sourceId: string | null;
        userId: string | null;
        count: number;
      }>
    >`
      SELECT l."lostReasonId" AS "reasonId",
             l."sourceId" AS "sourceId",
             l."assignedUserId" AS "userId",
             COUNT(*)::int AS "count"
      FROM "Lead" l
      JOIN "PipelineStage" s ON s."id" = l."pipelineStageId"
      WHERE l."tenantId" = ${tenantId}::uuid
        AND l."deletedAt" IS NULL
        AND s."closeType" = 'LOST'
        AND COALESCE(l."closedAt", l."stageEnteredAt") >= ${period.from}
        AND COALESCE(l."closedAt", l."stageEnteredAt") < ${period.to}
        AND ${buildLeadScopeSql(scope)}
      GROUP BY 1, 2, 3
    `;
    const counted = rows.map((row) => ({ ...row, count: Number(row.count) }));
    const total = counted.reduce((sum, row) => sum + row.count, 0);
    if (total === 0) {
      return { total: 0, reasons: [], bySource: [], byAgent: [] };
    }

    const ids = (pick: (row: (typeof counted)[number]) => string | null) => [
      ...new Set(counted.map(pick).filter((id): id is string => !!id)),
    ];
    const [reasons, sources, users] = await Promise.all([
      this.prisma.lostReason.findMany({
        where: { tenantId, id: { in: ids((row) => row.reasonId) } },
        select: { id: true, name: true, recyclable: true },
      }),
      this.prisma.leadSource.findMany({
        where: { tenantId, id: { in: ids((row) => row.sourceId) } },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { tenantId, id: { in: ids((row) => row.userId) } },
        select: { id: true, name: true },
      }),
    ]);
    const reasonBy = new Map(reasons.map((reason) => [reason.id, reason]));
    const sourceName = new Map(
      sources.map((source) => [source.id, source.name]),
    );
    const userName = new Map(users.map((user) => [user.id, user.name]));

    const byReason = new Map<string | null, number>();
    for (const row of counted) {
      byReason.set(row.reasonId, (byReason.get(row.reasonId) ?? 0) + row.count);
    }

    return {
      total,
      reasons: [...byReason.entries()]
        .map(([reasonId, count]) => {
          const reason = reasonId ? reasonBy.get(reasonId) : undefined;
          return {
            reasonId,
            name: reason?.name ?? NO_REASON,
            count,
            percent: percent(count, total),
            recyclable: reason?.recyclable ?? false,
          };
        })
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      bySource: buildBreakdown(
        counted.map((row) => ({
          key: row.sourceId,
          reasonId: row.reasonId,
          count: row.count,
        })),
        (key) => (key ? (sourceName.get(key) ?? NO_SOURCE) : NO_SOURCE),
        BREAKDOWN_LIMIT,
      ),
      byAgent: buildBreakdown(
        counted.map((row) => ({
          key: row.userId,
          reasonId: row.reasonId,
          count: row.count,
        })),
        (key) => (key ? (userName.get(key) ?? UNASSIGNED) : UNASSIGNED),
        BREAKDOWN_LIMIT,
      ),
    };
  }

  // ─── Recycled leads won back ───────────────────────────────────────────

  private async wonBack(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardLossesResponse['wonBack']> {
    const [rows, reEngageTasks] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{
          leadId: string;
          name: string;
          userId: string | null;
          userName: string | null;
          lostAt: Date;
          wonAt: Date;
          lostReasonName: string | null;
          viaReEngage: boolean;
        }>
      >`
        SELECT l."id" AS "leadId",
               l."fullName" AS "name",
               u."id" AS "userId",
               u."name" AS "userName",
               lost."at" AS "lostAt",
               won."at" AS "wonAt",
               lost."reason" AS "lostReasonName",
               EXISTS (
                 SELECT 1 FROM "Task" t
                 WHERE t."leadId" = l."id"
                   AND t."tenantId" = ${tenantId}::uuid
                   AND t."ruleKey" = ${RULE_KEYS.RE_ENGAGE}
                   AND t."createdAt" >= lost."at"
                   AND t."createdAt" <= won."at"
               ) AS "viaReEngage"
        FROM "Lead" l
        JOIN LATERAL (
          SELECT la."createdAt" AS "at"
          FROM "LeadActivity" la
          JOIN "PipelineStage" ws
            ON ws."id"::text = la."metadata"->>'toStageId' AND ws."closeType" = 'WON'
          WHERE la."leadId" = l."id"
            AND la."eventType" = 'STAGE_CHANGED'
            AND la."createdAt" >= ${period.from}
            AND la."createdAt" < ${period.to}
          ORDER BY la."createdAt" DESC
          LIMIT 1
        ) won ON TRUE
        JOIN LATERAL (
          SELECT la."createdAt" AS "at", la."metadata"->>'lostReasonName' AS "reason"
          FROM "LeadActivity" la
          JOIN "PipelineStage" ls
            ON ls."id"::text = la."metadata"->>'toStageId' AND ls."closeType" = 'LOST'
          WHERE la."leadId" = l."id"
            AND la."eventType" = 'STAGE_CHANGED'
            AND la."createdAt" < won."at"
          ORDER BY la."createdAt" DESC
          LIMIT 1
        ) lost ON TRUE
        LEFT JOIN "User" u ON u."id" = l."assignedUserId"
        WHERE l."tenantId" = ${tenantId}::uuid
          AND l."deletedAt" IS NULL
          AND ${buildLeadScopeSql(scope)}
        ORDER BY won."at" DESC
      `,
      this.prisma.task.count({
        where: {
          tenantId,
          ruleKey: RULE_KEYS.RE_ENGAGE,
          createdAt: { gte: period.from, lt: period.to },
          ...leadRelationScope(scope),
        },
      }),
    ]);

    const leads: DashboardWonBackLead[] = rows.map((row) => ({
      leadId: row.leadId,
      name: row.name,
      lostAt: row.lostAt.toISOString(),
      wonAt: row.wonAt.toISOString(),
      lostReasonName: row.lostReasonName,
      agent:
        row.userId && row.userName
          ? { id: row.userId, name: row.userName }
          : null,
      viaReEngage: Boolean(row.viaReEngage),
    }));

    return {
      count: leads.length,
      viaReEngage: leads.filter((lead) => lead.viaReEngage).length,
      reEngageTasks,
      leads: leads.slice(0, WON_BACK_LIST_LIMIT),
    };
  }
}

function roundDays(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.round(Number(value) * 10) / 10;
}
