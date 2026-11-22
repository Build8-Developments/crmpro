import { BadRequestException, Injectable } from '@nestjs/common';
import { DealStatus } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  monthBounds,
  periodOf,
  periodRange,
  shiftPeriod,
} from '../../common/utils/month-period.util';
import { AuditWriterService } from '../audit/audit-writer.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { VISIT_INTERACTION_WHERE } from '../targets/target-actuals.service';
import type { SaveSourceSpendDto } from './dto/save-source-spend.dto';
import {
  DEFAULT_SPEND_MONTHS,
  MAX_SPEND_MONTHS,
  SPEND_AUDIT_ACTIONS,
  SPEND_AUDIT_ENTITY,
} from './source-spend.constants';
import type {
  SourceSpendResponse,
  SourceSpendRow,
  SpendCell,
} from './source-spend.types';

const DEFAULT_TIME_ZONE = 'Africa/Cairo';
const DEFAULT_CURRENCY = 'EGP';

/** Funnel counts for one source in one month. */
interface Counts {
  leads: number;
  visits: number;
  deals: number;
}

const cellKey = (sourceId: string, period: string) => `${sourceId}:${period}`;

/** amount ÷ count to the cent; null without spend or without a count. */
export function costPer(amount: number | null, count: number): number | null {
  if (amount === null || count === 0) return null;
  return Math.round((amount / count) * 100) / 100;
}

function toCell(
  period: string,
  amount: number | null,
  note: string | null,
  counts: Counts,
): SpendCell {
  return {
    period,
    amount,
    note,
    ...counts,
    costPerLead: costPer(amount, counts.leads),
    costPerVisit: costPer(amount, counts.visits),
    costPerDeal: costPer(amount, counts.deals),
  };
}

/**
 * Marketing spend per lead source and month, entered by the owner (spec
 * §2.7), next to what each source produced: enough for cost per lead, per
 * visit and per deal without modelling campaigns. Counts are workspace-wide.
 */
@Injectable()
export class SourceSpendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async getGrid(
    tenantId: string,
    range: { from?: string; to?: string },
    now = new Date(),
  ): Promise<SourceSpendResponse> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true, currency: true },
    });
    const timeZone = settings?.timezone ?? DEFAULT_TIME_ZONE;
    const currency = settings?.currency ?? DEFAULT_CURRENCY;

    const { from, to } = resolveRange(range, periodOf(now, timeZone));
    const periods = periodRange(from, to);
    const bounds = periods.map((period) => monthBounds(period, timeZone));
    const rangeStart = bounds[0].start;
    const rangeEnd = bounds[bounds.length - 1].end;

    const [sources, spends, leadsByMonth, visitsByMonth, deals] =
      await Promise.all([
        this.prisma.leadSource.findMany({
          where: { tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.sourceSpend.findMany({
          where: { tenantId, period: { in: periods } },
          select: { sourceId: true, period: true, amount: true, note: true },
        }),
        Promise.all(
          bounds.map((month) =>
            this.prisma.lead.groupBy({
              by: ['sourceId'],
              where: {
                tenantId,
                deletedAt: null,
                sourceId: { not: null },
                createdAt: { gte: month.start, lt: month.end },
              },
              _count: { _all: true },
            }),
          ),
        ),
        Promise.all(
          bounds.map((month) =>
            this.prisma.lead.groupBy({
              by: ['sourceId'],
              where: {
                tenantId,
                deletedAt: null,
                sourceId: { not: null },
                interactions: {
                  some: {
                    occurredAt: { gte: month.start, lt: month.end },
                    ...VISIT_INTERACTION_WHERE,
                  },
                },
              },
              _count: { _all: true },
            }),
          ),
        ),
        this.prisma.deal.findMany({
          where: {
            tenantId,
            status: { not: DealStatus.CANCELLED },
            reservedAt: { gte: rangeStart, lt: rangeEnd },
            lead: { sourceId: { not: null }, deletedAt: null },
          },
          select: { reservedAt: true, lead: { select: { sourceId: true } } },
        }),
      ]);

    const counts = new Map<string, Counts>();
    const countsOf = (sourceId: string, period: string) => {
      const key = cellKey(sourceId, period);
      let entry = counts.get(key);
      if (!entry) {
        entry = { leads: 0, visits: 0, deals: 0 };
        counts.set(key, entry);
      }
      return entry;
    };
    periods.forEach((period, index) => {
      for (const row of leadsByMonth[index]) {
        if (row.sourceId)
          countsOf(row.sourceId, period).leads += row._count._all;
      }
      for (const row of visitsByMonth[index]) {
        if (row.sourceId)
          countsOf(row.sourceId, period).visits += row._count._all;
      }
    });
    for (const deal of deals) {
      const sourceId = deal.lead.sourceId;
      if (sourceId)
        countsOf(sourceId, periodOf(deal.reservedAt, timeZone)).deals += 1;
    }

    const spendOf = new Map(
      spends.map((spend) => [
        cellKey(spend.sourceId, spend.period),
        { amount: spend.amount.toNumber(), note: spend.note },
      ]),
    );

    const rows: SourceSpendRow[] = sources.map((source) => ({
      source,
      months: periods.map((period) => {
        const spend = spendOf.get(cellKey(source.id, period));
        return toCell(
          period,
          spend?.amount ?? null,
          spend?.note ?? null,
          counts.get(cellKey(source.id, period)) ?? {
            leads: 0,
            visits: 0,
            deals: 0,
          },
        );
      }),
    }));

    const totals = periods.map((period, index) => {
      let amount: number | null = null;
      const sum: Counts = { leads: 0, visits: 0, deals: 0 };
      for (const row of rows) {
        const cell = row.months[index];
        if (cell.amount !== null) amount = (amount ?? 0) + cell.amount;
        sum.leads += cell.leads;
        sum.visits += cell.visits;
        sum.deals += cell.deals;
      }
      return toCell(period, amount, null, sum);
    });

    return { from, to, periods, timeZone, currency, sources: rows, totals };
  }

  /** Sets or clears monthly amounts in one audited transaction. */
  async save(
    user: AuthenticatedUser,
    dto: SaveSourceSpendDto,
  ): Promise<{ changed: number }> {
    const seen = new Set<string>();
    for (const entry of dto.entries) {
      const key = cellKey(entry.sourceId, entry.period);
      if (seen.has(key)) {
        throw new BadRequestException(
          'Each source and month may appear only once',
        );
      }
      seen.add(key);
    }
    if (dto.entries.length === 0) return { changed: 0 };

    const sourceIds = [...new Set(dto.entries.map((entry) => entry.sourceId))];
    const known = await this.prisma.leadSource.count({
      where: { tenantId: user.tenantId, id: { in: sourceIds } },
    });
    if (known !== sourceIds.length) {
      throw new BadRequestException('Lead source not found');
    }

    const periods = [...new Set(dto.entries.map((entry) => entry.period))];
    const changes = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.sourceSpend.findMany({
        where: {
          tenantId: user.tenantId,
          sourceId: { in: sourceIds },
          period: { in: periods },
        },
        select: {
          id: true,
          sourceId: true,
          period: true,
          amount: true,
          note: true,
        },
      });
      const current = new Map(
        existing.map((row) => [cellKey(row.sourceId, row.period), row]),
      );

      const changed: Array<{
        sourceId: string;
        period: string;
        from: number | null;
        to: number | null;
        note?: { from: string | null; to: string | null };
      }> = [];

      for (const entry of dto.entries) {
        const found = current.get(cellKey(entry.sourceId, entry.period));
        const before = found ? found.amount.toNumber() : null;
        const noteBefore = found?.note ?? null;
        const noteAfter =
          entry.amount === null
            ? null
            : entry.note === undefined
              ? noteBefore
              : entry.note;

        if (before === entry.amount && noteBefore === noteAfter) continue;

        if (entry.amount === null) {
          await tx.sourceSpend.delete({ where: { id: found!.id } });
        } else {
          await tx.sourceSpend.upsert({
            where: {
              tenantId_sourceId_period: {
                tenantId: user.tenantId,
                sourceId: entry.sourceId,
                period: entry.period,
              },
            },
            create: {
              tenantId: user.tenantId,
              sourceId: entry.sourceId,
              period: entry.period,
              amount: entry.amount,
              note: noteAfter,
              updatedByUserId: user.id,
            },
            update: {
              amount: entry.amount,
              note: noteAfter,
              updatedByUserId: user.id,
            },
          });
        }

        changed.push({
          sourceId: entry.sourceId,
          period: entry.period,
          from: before,
          to: entry.amount,
          ...(noteBefore !== noteAfter
            ? { note: { from: noteBefore, to: noteAfter } }
            : {}),
        });
      }

      if (changed.length > 0) {
        await this.auditWriter.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: SPEND_AUDIT_ACTIONS.UPDATED,
          entityType: SPEND_AUDIT_ENTITY,
          entityId: null,
          metadata: { changes: changed },
          tx,
        });
      }
      return changed;
    });

    return { changed: changes.length };
  }
}

/**
 * The requested months, defaulting to the current month and the 5 before.
 * One end alone gives a 6-month window from (or to) it.
 */
export function resolveRange(
  range: { from?: string; to?: string },
  currentPeriod: string,
): { from: string; to: string } {
  const span = DEFAULT_SPEND_MONTHS - 1;
  const to =
    range.to ?? (range.from ? shiftPeriod(range.from, span) : currentPeriod);
  const from = range.from ?? shiftPeriod(to, -span);
  if (from > to) {
    throw new BadRequestException('from must not be after to');
  }
  if (periodRange(from, to).length > MAX_SPEND_MONTHS) {
    throw new BadRequestException(
      `At most ${MAX_SPEND_MONTHS} months per request`,
    );
  }
  return { from, to };
}
