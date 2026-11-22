import { Injectable } from '@nestjs/common';
import type { Prisma } from '@crmpro/database';
import {
  scopeUserIds,
  type LeadScope,
} from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { monthBounds } from '../../../common/utils/month-period.util';
import { buildLeadScopeSql } from '../queries/analytics-scope.util';
import type { DashboardPeriod } from './dashboard-period';
import type {
  DashboardProjectDemandRow,
  DashboardSourceRow,
  DashboardSourcesResponse,
} from './dashboard-sources.types';
import { costPer, prorateSpend, rate } from './dashboard-sources.util';

const DEFAULT_CURRENCY = 'EGP';
const NO_SOURCE_NAME = 'No source';
const UNKNOWN_SOURCE_NAME = 'Unknown source';
const MAX_PROJECTS = 50;

interface CohortRow {
  sourceId: string | null;
  leads: number;
  contacted: number;
  visited: number;
  won: number;
  closed: number;
  deals: number;
  revenue: number | null;
}

type SpendRecord = {
  sourceId: string;
  period: string;
  amount: Prisma.Decimal;
};

type ProjectRecord = {
  id: string;
  name: string;
  developer: { name: string } | null;
};

type Counts = Pick<
  DashboardSourceRow,
  'leads' | 'contacted' | 'visited' | 'won' | 'closed' | 'deals' | 'revenue'
>;

/**
 * §5.4 "Which leads are worth it?".
 *
 * Source table: a cohort view of the leads created in the period, whatever
 * has happened to them since (contacted, visited, closed, sold). Revenue is
 * the price of their contracted deals, whenever the contract was signed.
 * Spend is the owner's monthly SourceSpend fitted to the window (see
 * `spendShare`); costs are spend divided by the cohort's leads / visited
 * leads / live deals.
 *
 * Project demand vs sales: interest added in the period per project against
 * deals reserved and revenue contracted in the period on that project.
 */
@Injectable()
export class DashboardSourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardSourcesResponse> {
    const spendVisible = scopeUserIds(scope) === null;
    const scopeSql = buildLeadScopeSql(scope);

    const [settings, cohort, spendRows, interests, projectDeals] =
      await Promise.all([
        this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { currency: true },
        }),
        this.prisma.$queryRaw<CohortRow[]>`
          SELECT l."sourceId" AS "sourceId",
                 COUNT(*)::int AS "leads",
                 COUNT(*) FILTER (WHERE l."firstContactedAt" IS NOT NULL)::int AS "contacted",
                 COUNT(*) FILTER (WHERE EXISTS (
                   SELECT 1 FROM "Interaction" v
                   WHERE v."leadId" = l."id"
                     AND (v."channel" = 'SITE_VISIT' OR v."outcome" = 'VISIT_DONE')
                 ))::int AS "visited",
                 COUNT(*) FILTER (WHERE s."closeType" = 'WON')::int AS "won",
                 COUNT(*) FILTER (WHERE s."closeType" IS NOT NULL)::int AS "closed",
                 COALESCE(SUM(d."deals"), 0)::int AS "deals",
                 COALESCE(SUM(d."revenue"), 0)::float8 AS "revenue"
          FROM "Lead" l
          JOIN "PipelineStage" s ON s."id" = l."pipelineStageId"
          LEFT JOIN LATERAL (
            SELECT COUNT(*) FILTER (WHERE dl."status" <> 'CANCELLED') AS "deals",
                   SUM(dl."price") FILTER (WHERE dl."status" = 'CONTRACTED') AS "revenue"
            FROM "Deal" dl
            WHERE dl."leadId" = l."id" AND dl."tenantId" = l."tenantId"
          ) d ON TRUE
          WHERE l."tenantId" = ${tenantId}::uuid
            AND l."deletedAt" IS NULL
            AND l."createdAt" >= ${period.from}
            AND l."createdAt" < ${period.to}
            AND ${scopeSql}
          GROUP BY l."sourceId"
        `,
        spendVisible
          ? this.prisma.sourceSpend.findMany({
              where: { tenantId, period: { in: period.months } },
              select: { sourceId: true, period: true, amount: true },
            })
          : Promise.resolve<SpendRecord[]>([]),
        this.prisma.$queryRaw<
          Array<{ projectId: string; interested: number; hot: number }>
        >`
          SELECT lpi."projectId" AS "projectId",
                 COUNT(DISTINCT lpi."leadId")::int AS "interested",
                 COUNT(DISTINCT lpi."leadId") FILTER (
                   WHERE lpi."interestLevel" IN ('HIGH', 'HOT')
                 )::int AS "hot"
          FROM "LeadProjectInterest" lpi
          JOIN "Lead" l ON l."id" = lpi."leadId"
          WHERE l."tenantId" = ${tenantId}::uuid
            AND l."deletedAt" IS NULL
            AND lpi."createdAt" >= ${period.from}
            AND lpi."createdAt" < ${period.to}
            AND ${scopeSql}
          GROUP BY lpi."projectId"
        `,
        this.prisma.$queryRaw<
          Array<{ projectId: string; deals: number; revenue: number | null }>
        >`
          SELECT d."projectId" AS "projectId",
                 COUNT(*) FILTER (
                   WHERE d."status" <> 'CANCELLED'
                     AND d."reservedAt" >= ${period.from}
                     AND d."reservedAt" < ${period.to}
                 )::int AS "deals",
                 COALESCE(SUM(d."price") FILTER (
                   WHERE d."status" = 'CONTRACTED'
                     AND d."contractedAt" >= ${period.from}
                     AND d."contractedAt" < ${period.to}
                 ), 0)::float8 AS "revenue"
          FROM "Deal" d
          JOIN "Lead" l ON l."id" = d."leadId" AND l."deletedAt" IS NULL
          WHERE d."tenantId" = ${tenantId}::uuid
            AND d."projectId" IS NOT NULL
            AND (
              (d."reservedAt" >= ${period.from} AND d."reservedAt" < ${period.to})
              OR (d."contractedAt" >= ${period.from} AND d."contractedAt" < ${period.to})
            )
            AND ${scopeSql}
          GROUP BY d."projectId"
        `,
      ]);

    const spendBySource = prorateSpend(
      spendRows.map((row) => ({
        sourceId: row.sourceId,
        period: row.period,
        amount: row.amount.toNumber(),
      })),
      period,
      (month) => monthBounds(month, period.timeZone),
    );

    const sourceIds = new Set<string>();
    for (const row of cohort) if (row.sourceId) sourceIds.add(row.sourceId);
    for (const [sourceId, amount] of spendBySource) {
      if (amount > 0) sourceIds.add(sourceId);
    }
    const projectIds = new Set<string>([
      ...interests.map((row) => row.projectId),
      ...projectDeals.map((row) => row.projectId),
    ]);

    const [sources, projects] = await Promise.all([
      sourceIds.size === 0
        ? Promise.resolve<Array<{ id: string; name: string }>>([])
        : this.prisma.leadSource.findMany({
            where: { tenantId, id: { in: [...sourceIds] } },
            select: { id: true, name: true },
          }),
      projectIds.size === 0
        ? Promise.resolve<ProjectRecord[]>([])
        : this.prisma.project.findMany({
            where: { tenantId, id: { in: [...projectIds] } },
            select: {
              id: true,
              name: true,
              developer: { select: { name: true } },
            },
          }),
    ]);

    const cohortBySource = new Map(
      cohort.map((row) => [row.sourceId ?? null, row]),
    );
    const sourceName = new Map(
      sources.map((source) => [source.id, source.name]),
    );
    const rows: DashboardSourceRow[] = [...sourceIds].map((sourceId) =>
      buildRow(
        sourceId,
        sourceName.get(sourceId) ?? UNKNOWN_SOURCE_NAME,
        toCounts(cohortBySource.get(sourceId)),
        spendVisible ? (spendBySource.get(sourceId) ?? null) : null,
      ),
    );
    const unsourced = cohortBySource.get(null);
    if (unsourced) {
      rows.push(buildRow(null, NO_SOURCE_NAME, toCounts(unsourced), null));
    }
    rows.sort((a, b) => b.leads - a.leads || a.name.localeCompare(b.name));

    const totalCounts = rows.reduce<Counts>(
      (sum, row) => ({
        leads: sum.leads + row.leads,
        contacted: sum.contacted + row.contacted,
        visited: sum.visited + row.visited,
        won: sum.won + row.won,
        closed: sum.closed + row.closed,
        deals: sum.deals + row.deals,
        revenue: sum.revenue + row.revenue,
      }),
      toCounts(undefined),
    );
    const totalSpend = spendVisible
      ? rows.reduce((sum, row) => sum + (row.spend ?? 0), 0)
      : null;
    const {
      sourceId: _id,
      name: _name,
      ...totals
    } = buildRow(null, '', totalCounts, totalSpend);

    return {
      period: {
        key: period.key,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        timeZone: period.timeZone,
      },
      currency: settings?.currency ?? DEFAULT_CURRENCY,
      spendVisible,
      spendBasis: period.month !== null ? 'full-month' : 'prorated',
      sources: rows,
      totals,
      projects: buildProjects(projects, interests, projectDeals),
    };
  }
}

function toCounts(row: CohortRow | undefined): Counts {
  return {
    leads: row?.leads ?? 0,
    contacted: row?.contacted ?? 0,
    visited: row?.visited ?? 0,
    won: row?.won ?? 0,
    closed: row?.closed ?? 0,
    deals: row?.deals ?? 0,
    revenue: Number(row?.revenue ?? 0),
  };
}

export function buildRow(
  sourceId: string | null,
  name: string,
  counts: Counts,
  spend: number | null,
): DashboardSourceRow {
  const spent = spend !== null && spend > 0 ? spend : null;
  return {
    sourceId,
    name,
    ...counts,
    contactRate: rate(counts.contacted, counts.leads),
    visitRate: rate(counts.visited, counts.leads),
    winRate: rate(counts.won, counts.closed),
    spend: spent,
    costPerLead: costPer(spent, counts.leads),
    costPerVisit: costPer(spent, counts.visited),
    costPerDeal: costPer(spent, counts.deals),
  };
}

function buildProjects(
  projects: Array<{
    id: string;
    name: string;
    developer: { name: string } | null;
  }>,
  interests: Array<{ projectId: string; interested: number; hot: number }>,
  deals: Array<{ projectId: string; deals: number; revenue: number | null }>,
): DashboardProjectDemandRow[] {
  const interestBy = new Map(interests.map((row) => [row.projectId, row]));
  const dealsBy = new Map(deals.map((row) => [row.projectId, row]));
  return projects
    .map((project) => {
      const interest = interestBy.get(project.id);
      const sold = dealsBy.get(project.id);
      const interestedLeads = interest?.interested ?? 0;
      const dealCount = sold?.deals ?? 0;
      return {
        projectId: project.id,
        name: project.name,
        developerName: project.developer?.name ?? null,
        interestedLeads,
        hotInterest: interest?.hot ?? 0,
        deals: dealCount,
        revenue: Number(sold?.revenue ?? 0),
        conversionRate: rate(dealCount, interestedLeads),
      };
    })
    .filter(
      (row) => row.interestedLeads > 0 || row.deals > 0 || row.revenue > 0,
    )
    .sort(
      (a, b) =>
        b.interestedLeads - a.interestedLeads ||
        b.revenue - a.revenue ||
        a.name.localeCompare(b.name),
    )
    .slice(0, MAX_PROJECTS);
}
