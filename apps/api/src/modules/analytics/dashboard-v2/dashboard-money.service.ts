import { Injectable } from '@nestjs/common';
import { DealStatus, Prisma, TargetMetric } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { OPEN_LEAD_WHERE } from '../../leads/utils/lead-filter-where.util';
import {
  buildLeadScopeSql,
  withLeadScope,
} from '../queries/analytics-scope.util';
import type { DashboardPeriod } from './dashboard-period';
import type {
  DashboardMoneyResponse,
  DealBucket,
  ForecastStageRow,
  MoneyTargetOwner,
} from './dashboard-money.types';
import {
  buildRevenueTrend,
  changePercent,
  round2,
  toMoneyTarget,
  windowTargets,
} from './dashboard-money.util';

const DEFAULT_CURRENCY = 'EGP';

/** History used for stage-to-won rates and the average deal price. */
export const FORECAST_LOOKBACK_MONTHS = 12;

export const FORECAST_METHOD =
  'Open leads per stage × the share of leads closed in the last 12 months that reached that stage (or a later one) and were won × the average deal price.';

const TARGET_METRICS_USED = [
  TargetMetric.DEALS,
  TargetMetric.REVENUE,
  TargetMetric.COMMISSION,
];

interface DealTotalsRow {
  reserved_count: number;
  reserved_value: Prisma.Decimal | number | null;
  prev_reserved_count: number;
  prev_reserved_value: Prisma.Decimal | number | null;
  contracted_count: number;
  contracted_value: Prisma.Decimal | number | null;
  contracted_commission: Prisma.Decimal | number | null;
  prev_contracted_count: number;
  prev_contracted_value: Prisma.Decimal | number | null;
  prev_contracted_commission: Prisma.Decimal | number | null;
  cancelled_count: number;
  cancelled_value: Prisma.Decimal | number | null;
  prev_cancelled_count: number;
  prev_cancelled_value: Prisma.Decimal | number | null;
  backlog_count: number;
  backlog_value: Prisma.Decimal | number | null;
}

function num(
  value: Prisma.Decimal | number | bigint | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

/**
 * Dashboard v2 §5.2 "Are we making money?": contracted revenue and
 * commission vs target, deal flow (reserved / contracted / cancelled) vs the
 * previous window, a weighted pipeline forecast and a revenue trend.
 *
 * Deals count through their lead: lead scope applies (as on the deals list),
 * soft-deleted leads are excluded and cancelled deals never count as revenue.
 */
@Injectable()
export class DashboardMoneyService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardMoneyResponse> {
    const [settings, totals, revenueByDay, targets, forecast] =
      await Promise.all([
        this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { currency: true },
        }),
        this.dealTotals(tenantId, scope, period),
        this.revenueByDay(tenantId, scope, period),
        this.loadTargets(tenantId, scope, period),
        this.forecast(tenantId, scope, period.now),
      ]);

    const owner = targetOwner(scope);
    const revenue = num(totals.contracted_value);
    const commission = num(totals.contracted_commission);
    const reservedCount = num(totals.reserved_count);

    return {
      period: {
        key: period.key,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        previousFrom: period.previousFrom.toISOString(),
        previousTo: period.previousTo.toISOString(),
        months: period.months,
        month: period.month,
      },
      currency: settings?.currency ?? DEFAULT_CURRENCY,
      revenue: {
        current: revenue,
        previous: num(totals.prev_contracted_value),
        changePercent: changePercent(
          revenue,
          num(totals.prev_contracted_value),
        ),
        target: toMoneyTarget(
          revenue,
          targets.REVENUE,
          owner,
          period,
          Math.round,
        ),
      },
      commission: {
        current: commission,
        previous: num(totals.prev_contracted_commission),
        changePercent: changePercent(
          commission,
          num(totals.prev_contracted_commission),
        ),
        target: toMoneyTarget(
          commission,
          targets.COMMISSION,
          owner,
          period,
          Math.round,
        ),
      },
      deals: {
        reserved: {
          ...bucket(
            [reservedCount, num(totals.reserved_value)],
            [num(totals.prev_reserved_count), num(totals.prev_reserved_value)],
            dealsQuery(period, { periodField: 'reservedAt' }),
          ),
          target: toMoneyTarget(
            reservedCount,
            targets.DEALS,
            owner,
            period,
            round2,
          ),
        },
        contracted: bucket(
          [num(totals.contracted_count), revenue],
          [
            num(totals.prev_contracted_count),
            num(totals.prev_contracted_value),
          ],
          dealsQuery(period, {
            status: DealStatus.CONTRACTED,
            periodField: 'contractedAt',
          }),
        ),
        cancelled: bucket(
          [num(totals.cancelled_count), num(totals.cancelled_value)],
          [num(totals.prev_cancelled_count), num(totals.prev_cancelled_value)],
          { status: DealStatus.CANCELLED },
        ),
      },
      reservedBacklog: {
        count: num(totals.backlog_count),
        value: num(totals.backlog_value),
        listQuery: { status: DealStatus.RESERVED },
      },
      forecast,
      trend: buildRevenueTrend(period, revenueByDay),
    };
  }

  /** Every deal number of the window and the previous one, in one pass. */
  private async dealTotals(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DealTotalsRow> {
    const inWindow = (column: string, from: Date, to: Date) =>
      Prisma.sql`d.${Prisma.raw(`"${column}"`)} >= ${from} AND d.${Prisma.raw(`"${column}"`)} < ${to}`;
    const live = Prisma.sql`d."status" <> 'CANCELLED'`;
    const cancelled = Prisma.sql`d."status" = 'CANCELLED'`;
    const cur = (column: string) => inWindow(column, period.from, period.to);
    const prev = (column: string) =>
      inWindow(column, period.previousFrom, period.previousTo);

    const rows = await this.prisma.$queryRaw<DealTotalsRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE ${live} AND ${cur('reservedAt')})::int AS reserved_count,
        SUM(d."price") FILTER (WHERE ${live} AND ${cur('reservedAt')}) AS reserved_value,
        COUNT(*) FILTER (WHERE ${live} AND ${prev('reservedAt')})::int AS prev_reserved_count,
        SUM(d."price") FILTER (WHERE ${live} AND ${prev('reservedAt')}) AS prev_reserved_value,
        COUNT(*) FILTER (WHERE ${live} AND ${cur('contractedAt')})::int AS contracted_count,
        SUM(d."price") FILTER (WHERE ${live} AND ${cur('contractedAt')}) AS contracted_value,
        SUM(d."commissionAmount") FILTER (WHERE ${live} AND ${cur('contractedAt')}) AS contracted_commission,
        COUNT(*) FILTER (WHERE ${live} AND ${prev('contractedAt')})::int AS prev_contracted_count,
        SUM(d."price") FILTER (WHERE ${live} AND ${prev('contractedAt')}) AS prev_contracted_value,
        SUM(d."commissionAmount") FILTER (WHERE ${live} AND ${prev('contractedAt')}) AS prev_contracted_commission,
        COUNT(*) FILTER (WHERE ${cancelled} AND ${cur('cancelledAt')})::int AS cancelled_count,
        SUM(d."price") FILTER (WHERE ${cancelled} AND ${cur('cancelledAt')}) AS cancelled_value,
        COUNT(*) FILTER (WHERE ${cancelled} AND ${prev('cancelledAt')})::int AS prev_cancelled_count,
        SUM(d."price") FILTER (WHERE ${cancelled} AND ${prev('cancelledAt')}) AS prev_cancelled_value,
        COUNT(*) FILTER (WHERE d."status" = 'RESERVED')::int AS backlog_count,
        SUM(d."price") FILTER (WHERE d."status" = 'RESERVED') AS backlog_value
      FROM "Deal" d
      JOIN "Lead" l ON l."id" = d."leadId"
      WHERE d."tenantId" = ${tenantId}::uuid
        AND l."tenantId" = ${tenantId}::uuid
        AND l."deletedAt" IS NULL
        AND ${buildLeadScopeSql(scope)}
    `;
    return rows[0];
  }

  /** Contracted, non-cancelled revenue per local day over both windows. */
  private async revenueByDay(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ day: string; revenue: Prisma.Decimal | number | null }>
    >`
      SELECT
        -- Columns are UTC timestamps without zone: read as UTC, then local.
        to_char((d."contractedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${period.timeZone}, 'YYYY-MM-DD') AS day,
        SUM(d."price") AS revenue
      FROM "Deal" d
      JOIN "Lead" l ON l."id" = d."leadId"
      WHERE d."tenantId" = ${tenantId}::uuid
        AND l."tenantId" = ${tenantId}::uuid
        AND l."deletedAt" IS NULL
        AND d."status" <> 'CANCELLED'
        AND (
          (d."contractedAt" >= ${period.from} AND d."contractedAt" < ${period.to})
          OR (d."contractedAt" >= ${period.previousFrom} AND d."contractedAt" < ${period.previousTo})
        )
        AND ${buildLeadScopeSql(scope)}
      GROUP BY 1
    `;
    return new Map(rows.map((row) => [row.day, num(row.revenue)]));
  }

  /** Targets of the scope owner for the window's months (see windowTargets). */
  private async loadTargets(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ) {
    const targets = await this.prisma.target.findMany({
      where: {
        tenantId,
        period: { in: period.months },
        metric: { in: TARGET_METRICS_USED },
        ...targetOwnerWhere(scope),
      },
      select: { period: true, metric: true, value: true },
    });
    return windowTargets(
      period,
      targets.map((target) => ({
        period: target.period,
        metric: target.metric,
        value: target.value.toNumber(),
      })),
    );
  }

  /**
   * Weighted pipeline: for each open stage, open leads × historical
   * stage-to-won rate × average deal price. The rate comes from leads closed
   * (won or lost) in the lookback: a lead "reached" a stage when the furthest
   * open stage in its stage history (STAGE_CHANGED from/to ids) is that stage
   * or a later one; won leads passed every open stage of their pipeline.
   */
  private async forecast(
    tenantId: string,
    scope: LeadScope,
    now: Date,
  ): Promise<DashboardMoneyResponse['forecast']> {
    const lookbackFrom = new Date(now);
    lookbackFrom.setUTCMonth(
      lookbackFrom.getUTCMonth() - FORECAST_LOOKBACK_MONTHS,
    );

    const [stages, openGroups, history, averagePrice] = await Promise.all([
      this.prisma.pipelineStage.findMany({
        where: { tenantId, isClosed: false },
        select: {
          id: true,
          name: true,
          sortOrder: true,
          pipelineId: true,
          pipeline: { select: { name: true, isDefault: true } },
        },
      }),
      this.prisma.lead.groupBy({
        by: ['pipelineStageId'],
        where: withLeadScope(
          { tenantId, deletedAt: null, ...OPEN_LEAD_WHERE },
          scope,
        ),
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<
        Array<{ stage_id: string; reached: number; won: number }>
      >`
        WITH closed AS (
          SELECT l."id", l."pipelineId", cs."closeType"
          FROM "Lead" l
          JOIN "PipelineStage" cs ON cs."id" = l."pipelineStageId"
          WHERE l."tenantId" = ${tenantId}::uuid
            AND l."deletedAt" IS NULL
            AND cs."isClosed" = true
            AND cs."closeType" IN ('WON', 'LOST')
            AND l."closedAt" >= ${lookbackFrom}
            AND ${buildLeadScopeSql(scope)}
        ),
        furthest AS (
          SELECT c."id", c."pipelineId", c."closeType", MAX(s."sortOrder") AS max_order
          FROM closed c
          LEFT JOIN "LeadActivity" la
            ON la."leadId" = c."id"
            AND la."tenantId" = ${tenantId}::uuid
            AND la."eventType" = 'STAGE_CHANGED'
          LEFT JOIN "PipelineStage" s
            ON s."pipelineId" = c."pipelineId"
            AND s."isClosed" = false
            AND s."id"::text IN (la."metadata"->>'fromStageId', la."metadata"->>'toStageId')
          GROUP BY c."id", c."pipelineId", c."closeType"
        )
        SELECT
          s."id" AS stage_id,
          COUNT(f."id") FILTER (
            WHERE f."closeType" = 'WON' OR f.max_order >= s."sortOrder"
          )::int AS reached,
          COUNT(f."id") FILTER (WHERE f."closeType" = 'WON')::int AS won
        FROM "PipelineStage" s
        JOIN furthest f ON f."pipelineId" = s."pipelineId"
        WHERE s."tenantId" = ${tenantId}::uuid AND s."isClosed" = false
        GROUP BY s."id"
      `,
      this.prisma.deal.aggregate({
        where: {
          tenantId,
          status: { not: DealStatus.CANCELLED },
          reservedAt: { gte: lookbackFrom },
          lead: withLeadScope({ tenantId, deletedAt: null }, scope),
        },
        _avg: { price: true },
        _count: { _all: true },
      }),
    ]);

    const openByStage = new Map(
      openGroups.map((group) => [group.pipelineStageId, group._count._all]),
    );
    const historyByStage = new Map(history.map((row) => [row.stage_id, row]));
    const avgPrice = Math.round(num(averagePrice._avg.price));

    const rows: ForecastStageRow[] = [...stages]
      .sort(
        (a, b) =>
          Number(b.pipeline.isDefault) - Number(a.pipeline.isDefault) ||
          a.pipeline.name.localeCompare(b.pipeline.name) ||
          a.sortOrder - b.sortOrder,
      )
      .map((stage) => {
        const openLeads = openByStage.get(stage.id) ?? 0;
        const past = historyByStage.get(stage.id);
        const reachedCount = num(past?.reached);
        const wonCount = num(past?.won);
        const winRate = reachedCount > 0 ? wonCount / reachedCount : null;
        const expectedDeals = round2(openLeads * (winRate ?? 0));
        return {
          stageId: stage.id,
          stageName: stage.name,
          pipelineId: stage.pipelineId,
          pipelineName: stage.pipeline.name,
          openLeads,
          reachedCount,
          wonCount,
          winRate: winRate === null ? null : Math.round(winRate * 1000) / 1000,
          expectedDeals,
          expectedRevenue: Math.round(openLeads * (winRate ?? 0) * avgPrice),
          listQuery: { stageIds: stage.id, openOnly: 'true' },
        };
      })
      // Stages with neither open leads nor history add nothing to read.
      .filter((row) => row.openLeads > 0 || row.reachedCount > 0);

    return {
      method: FORECAST_METHOD,
      lookbackMonths: FORECAST_LOOKBACK_MONTHS,
      averageDealPrice: avgPrice,
      averageDealSampleSize: averagePrice._count._all,
      stages: rows,
      totals: {
        openLeads: rows.reduce((total, row) => total + row.openLeads, 0),
        expectedDeals: round2(
          rows.reduce((total, row) => total + row.expectedDeals, 0),
        ),
        expectedRevenue: rows.reduce(
          (total, row) => total + row.expectedRevenue,
          0,
        ),
      },
    };
  }
}

function targetOwner(scope: LeadScope): MoneyTargetOwner {
  return scope.kind === 'all' ? 'workspace' : scope.kind;
}

/** Workspace goal for "all"; the members' own targets for team; own target. */
function targetOwnerWhere(scope: LeadScope): Prisma.TargetWhereInput {
  switch (scope.kind) {
    case 'all':
      return { userId: null };
    case 'team':
      return { userId: { in: scope.userIds } };
    case 'own':
      return { userId: scope.actorUserId };
  }
}

function bucket(
  [count, value]: [number, number],
  [previousCount, previousValue]: [number, number],
  listQuery: Record<string, string>,
): DealBucket {
  return {
    count,
    value,
    previousCount,
    previousValue,
    countChangePercent: changePercent(count, previousCount),
    valueChangePercent: changePercent(value, previousValue),
    listQuery,
  };
}

/** `/deals?…` for a window on one of the deal dates. */
function dealsQuery(
  period: DashboardPeriod,
  extra: Record<string, string>,
): Record<string, string> {
  return {
    ...extra,
    from: period.from.toISOString(),
    to: period.to.toISOString(),
  };
}
