import { Injectable } from '@nestjs/common';
import {
  DealStatus,
  InteractionChannel,
  InteractionOutcome,
  Prisma,
  TargetMetric,
} from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { MonthBounds } from '../../common/utils/month-period.util';
import { TARGET_METRICS } from './targets.constants';
import type { MetricValues } from './targets.types';

export interface MonthActuals {
  /** Per credited user (deal agent / interaction author). */
  byUser: Map<string, MetricValues>;
  /** Everyone in the workspace, including deals with no agent. */
  total: MetricValues;
}

/** An interaction is a visit when it was one, or its outcome says so. */
export const VISIT_INTERACTION_WHERE: Prisma.InteractionWhereInput = {
  OR: [
    { channel: InteractionChannel.SITE_VISIT },
    { outcome: InteractionOutcome.VISIT_DONE },
  ],
};

export function emptyMetricValues(): MetricValues {
  return Object.fromEntries(
    TARGET_METRICS.map((metric) => [metric, 0]),
  ) as MetricValues;
}

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : value.toNumber();
}

/**
 * What people actually did in a month (spec §2.6):
 * - DEALS: deals reserved in the month and not cancelled, by agent;
 * - REVENUE / COMMISSION: price / commission of deals contracted in the
 *   month and not cancelled since;
 * - INTERACTIONS: every logged touch, by its author;
 * - VISITS: touches that were a site visit or ended "visit done" (once each).
 */
@Injectable()
export class TargetActualsService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(
    tenantId: string,
    bounds: MonthBounds,
    options: { userId?: string } = {},
  ): Promise<MonthActuals> {
    const range = { gte: bounds.start, lt: bounds.end };
    const agent = options.userId ? { agentId: options.userId } : {};
    const author = options.userId ? { userId: options.userId } : {};

    const [reserved, contracted, interactions, visits] = await Promise.all([
      this.prisma.deal.groupBy({
        by: ['agentId'],
        where: {
          tenantId,
          ...agent,
          lead: { deletedAt: null },
          status: { not: DealStatus.CANCELLED },
          reservedAt: range,
        },
        _count: { _all: true },
      }),
      this.prisma.deal.groupBy({
        by: ['agentId'],
        where: {
          tenantId,
          ...agent,
          lead: { deletedAt: null },
          status: { not: DealStatus.CANCELLED },
          contractedAt: range,
        },
        _sum: { price: true, commissionAmount: true },
      }),
      this.prisma.interaction.groupBy({
        by: ['userId'],
        where: {
          tenantId,
          ...author,
          lead: { deletedAt: null },
          occurredAt: range,
        },
        _count: { _all: true },
      }),
      this.prisma.interaction.groupBy({
        by: ['userId'],
        where: {
          tenantId,
          ...author,
          lead: { deletedAt: null },
          occurredAt: range,
          ...VISIT_INTERACTION_WHERE,
        },
        _count: { _all: true },
      }),
    ]);

    const byUser = new Map<string, MetricValues>();
    const total = emptyMetricValues();
    const add = (
      userId: string | null,
      metric: TargetMetric,
      amount: number,
    ) => {
      total[metric] += amount;
      if (!userId) return;
      const values = byUser.get(userId) ?? emptyMetricValues();
      values[metric] += amount;
      byUser.set(userId, values);
    };

    for (const row of reserved) {
      add(row.agentId, TargetMetric.DEALS, row._count._all);
    }
    for (const row of contracted) {
      add(row.agentId, TargetMetric.REVENUE, toNumber(row._sum.price));
      add(
        row.agentId,
        TargetMetric.COMMISSION,
        toNumber(row._sum.commissionAmount),
      );
    }
    for (const row of interactions) {
      add(row.userId, TargetMetric.INTERACTIONS, row._count._all);
    }
    for (const row of visits) {
      add(row.userId, TargetMetric.VISITS, row._count._all);
    }

    return { byUser, total };
  }
}
