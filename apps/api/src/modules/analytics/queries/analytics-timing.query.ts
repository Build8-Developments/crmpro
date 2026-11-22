import { Prisma } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { AnalyticsDateRange } from '../analytics.types';
import { buildLeadScopeSql } from './analytics-scope.util';

/*
 * Response time = lead created → first logged interaction (Lead.firstContactedAt,
 * stamped by the interactions service). Assignments, notes and stage moves are
 * not contact with the client, so they no longer count.
 */

export function buildLeadCreatedAtSql(
  range: AnalyticsDateRange,
  column = 'l."createdAt"',
): Prisma.Sql {
  if (range.from && range.to) {
    return Prisma.sql`${Prisma.raw(column)} >= ${range.from} AND ${Prisma.raw(column)} <= ${range.to}`;
  }

  if (range.from) {
    return Prisma.sql`${Prisma.raw(column)} >= ${range.from}`;
  }

  if (range.to) {
    return Prisma.sql`${Prisma.raw(column)} <= ${range.to}`;
  }

  return Prisma.sql`TRUE`;
}

export async function queryAvgResponseTimeHours(
  prisma: {
    $queryRaw: <T>(
      query: TemplateStringsArray | Prisma.Sql,
      ...values: unknown[]
    ) => Promise<T>;
  },
  tenantId: string,
  range: AnalyticsDateRange,
  scope: LeadScope,
): Promise<number | null> {
  const dateFilter = buildLeadCreatedAtSql(range);
  const scopeFilter = buildLeadScopeSql(scope);

  const rows = await prisma.$queryRaw<Array<{ avg_hours: number | null }>>`
    SELECT AVG(
      EXTRACT(EPOCH FROM (l."firstContactedAt" - l."createdAt")) / 3600.0
    ) AS avg_hours
    FROM "Lead" l
    WHERE l."tenantId" = ${tenantId}::uuid
      AND l."deletedAt" IS NULL
      AND l."firstContactedAt" IS NOT NULL
      AND ${dateFilter}
      AND ${scopeFilter}
  `;

  return rows[0]?.avg_hours ?? null;
}

export async function queryAvgLeadAgeDays(
  prisma: {
    $queryRaw: <T>(
      query: TemplateStringsArray | Prisma.Sql,
      ...values: unknown[]
    ) => Promise<T>;
  },
  tenantId: string,
  range: AnalyticsDateRange,
  scope: LeadScope,
): Promise<number | null> {
  const dateFilter = buildLeadCreatedAtSql(range);
  const scopeFilter = buildLeadScopeSql(scope);

  const rows = await prisma.$queryRaw<Array<{ avg_days: number | null }>>`
    SELECT AVG(
      EXTRACT(EPOCH FROM (NOW() - l."createdAt")) / 86400.0
    ) AS avg_days
    FROM "Lead" l
    INNER JOIN "PipelineStage" ps ON ps."id" = l."pipelineStageId"
    WHERE l."tenantId" = ${tenantId}::uuid
      AND l."deletedAt" IS NULL
      AND l."status" = 'OPEN'
      AND ps."isClosed" = false
      AND ${dateFilter}
      AND ${scopeFilter}
  `;

  return rows[0]?.avg_days ?? null;
}

export interface AgentTimingRow {
  user_id: string;
  avg_response_hours: number | null;
  avg_closing_days: number | null;
}

export async function queryAgentTimingMetrics(
  prisma: {
    $queryRaw: <T>(
      query: TemplateStringsArray | Prisma.Sql,
      ...values: unknown[]
    ) => Promise<T>;
  },
  tenantId: string,
  range: AnalyticsDateRange,
  scope: LeadScope,
): Promise<AgentTimingRow[]> {
  const dateFilter = buildLeadCreatedAtSql(range);
  const scopeFilter = buildLeadScopeSql(scope);

  return prisma.$queryRaw<AgentTimingRow[]>`
    SELECT
      l."assignedUserId" AS user_id,
      AVG(
        EXTRACT(EPOCH FROM (l."firstContactedAt" - l."createdAt")) / 3600.0
      ) AS avg_response_hours,
      AVG(
        CASE
          WHEN won_event.won_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (won_event.won_at - l."createdAt")) / 86400.0
        END
      ) AS avg_closing_days
    FROM "Lead" l
    LEFT JOIN LATERAL (
      SELECT MIN(la."createdAt") AS won_at
      FROM "LeadActivity" la
      WHERE la."leadId" = l."id"
        AND la."eventType" = 'STAGE_CHANGED'
        AND la.metadata->>'closeType' = 'WON'
    ) won_event ON true
    WHERE l."tenantId" = ${tenantId}::uuid
      AND l."deletedAt" IS NULL
      AND l."assignedUserId" IS NOT NULL
      AND ${dateFilter}
      AND ${scopeFilter}
    GROUP BY l."assignedUserId"
  `;
}
