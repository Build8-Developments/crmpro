import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DealStatus, LeadActivityEventType, Prisma } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  type LeadScope,
  leadScopeWhere,
  PermissionsService,
} from '../../common/auth';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { DailyStatsService } from '../stats/daily-stats.service';
import {
  LeadUpdatedEvent,
  TasksChangedEvent,
} from '../../common/events/domain-event.types';
import {
  buildPaginationMeta,
  getPaginationParams,
  type PaginationMeta,
} from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SortOrder } from '../../common/query/enums/sort-order.enum';
import { validateSortField } from '../../common/query/utils/sort.util';
import { AuditWriterService } from '../audit/audit-writer.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { LeadStageService } from '../leads/services/lead-stage.service';
import { DEAL_AUDIT_ACTIONS, DEAL_AUDIT_ENTITY_TYPE } from './deal.constants';
import {
  computeCommission,
  type DealRecord,
  type DealResponse,
  dealSelect,
  toDealResponse,
} from './deal.mapper';
import { DEAL_SORT_FIELDS, GetDealsQueryDto } from './dto/get-deals-query.dto';
import {
  CancelDealDto,
  ContractDealDto,
  UpdateDealDto,
} from './dto/update-deal.dto';
import { DealRecorderService } from './services/deal-recorder.service';
import { DealRulesService } from '../workflow/rules/deal-rules.service';

export interface DealTotalsBucket {
  count: number;
  price: number;
  commission: number;
}

export interface DealTotals extends DealTotalsBucket {
  byStatus: Record<DealStatus, DealTotalsBucket>;
}

export interface DealListResponse {
  items: DealResponse[];
  pagination: PaginationMeta;
  totals: DealTotals;
}

/** Fields compared for DEAL_UPDATED (activity lists the ones that changed). */
const EDITABLE_FIELDS = [
  'projectId',
  'unitType',
  'unitCode',
  'price',
  'downPaymentPct',
  'paymentPlan',
  'commissionPct',
  'commissionAmount',
  'agentId',
  'reservedAt',
  'expectedContractAt',
  'contractedAt',
  'notes',
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

const emptyBucket = (): DealTotalsBucket => ({
  count: 0,
  price: 0,
  commission: 0,
});

/**
 * Deals on won leads (spec §2.5). Every read and write goes through the
 * deal's lead, so lead scope applies: out-of-scope deals are 404.
 */
@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly recorder: DealRecorderService,
    private readonly leadStage: LeadStageService,
    private readonly leadActivity: LeadActivityService,
    private readonly auditWriter: AuditWriterService,
    private readonly events: DomainEventBus,
    private readonly dailyStats: DailyStatsService,
    private readonly dealRules: DealRulesService,
  ) {}

  async list(
    tenantId: string,
    query: GetDealsQueryDto,
    scope: LeadScope,
  ): Promise<DealListResponse> {
    const where = this.buildWhere(tenantId, query, scope);
    const sortField =
      validateSortField(query.sortBy, DEAL_SORT_FIELDS) ?? 'reservedAt';
    // Without an explicit sort, newest first.
    const sortOrder = query.sortBy
      ? (query.sortOrder ?? SortOrder.ASC)
      : SortOrder.DESC;
    const orderBy: Prisma.DealOrderByWithRelationInput[] = [
      sortField === 'contractedAt'
        ? { contractedAt: { sort: sortOrder, nulls: 'last' } }
        : { [sortField]: sortOrder },
      { createdAt: 'desc' },
    ];

    const { page, limit, skip, take } = getPaginationParams(query);
    const [records, totalItems, groups] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        orderBy,
        select: dealSelect,
        skip,
        take,
      }),
      this.prisma.deal.count({ where }),
      this.prisma.deal.groupBy({
        by: ['status'],
        where,
        orderBy: { status: 'asc' },
        _count: { _all: true },
        _sum: { price: true, commissionAmount: true },
      }),
    ]);

    const totals: DealTotals = {
      ...emptyBucket(),
      byStatus: {
        [DealStatus.RESERVED]: emptyBucket(),
        [DealStatus.CONTRACTED]: emptyBucket(),
        [DealStatus.CANCELLED]: emptyBucket(),
      },
    };
    for (const group of groups) {
      const count =
        typeof group._count === 'object' ? (group._count._all ?? 0) : 0;
      const bucket = {
        count,
        price: Number(group._sum?.price ?? 0),
        commission: Number(group._sum?.commissionAmount ?? 0),
      };
      totals.byStatus[group.status] = bucket;
      totals.count += bucket.count;
      totals.price += bucket.price;
      totals.commission += bucket.commission;
    }

    return {
      items: records.map(toDealResponse),
      pagination: buildPaginationMeta(page, limit, totalItems),
      totals,
    };
  }

  async get(
    tenantId: string,
    dealId: string,
    scope: LeadScope,
  ): Promise<DealResponse> {
    return toDealResponse(await this.getRecordOrThrow(tenantId, dealId, scope));
  }

  /** Every deal of a lead, cancelled ones included, newest first. */
  async listForLead(
    tenantId: string,
    leadId: string,
    scope: LeadScope,
  ): Promise<DealResponse[]> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const deals = await this.prisma.deal.findMany({
      where: { tenantId, leadId: lead.id },
      orderBy: [{ reservedAt: 'desc' }, { createdAt: 'desc' }],
      select: dealSelect,
    });
    return deals.map(toDealResponse);
  }

  async update(
    tenantId: string,
    actorUserId: string,
    dealId: string,
    dto: UpdateDealDto,
    scope: LeadScope,
  ): Promise<DealResponse> {
    const deal = await this.getRecordOrThrow(tenantId, dealId, scope);
    if (deal.status === DealStatus.CANCELLED) {
      throw new BadRequestException('Cancelled deals cannot be edited');
    }
    const now = new Date();

    const data: Prisma.DealUncheckedUpdateInput = {};
    if (dto.projectId !== undefined) {
      data.projectId = dto.projectId
        ? (await this.recorder.findProject(tenantId, dto.projectId)).id
        : null;
    }
    if (dto.agentId !== undefined && dto.agentId !== deal.agent?.id) {
      await this.assertPermission(
        tenantId,
        actorUserId,
        PERMISSIONS.LEAD_ASSIGN,
        'Only managers can credit the deal to someone else',
      );
      if (dto.agentId) {
        const agent = await this.recorder.findActiveUser(tenantId, dto.agentId);
        if (!agent) {
          throw new BadRequestException('Agent not found or inactive');
        }
      }
      data.agentId = dto.agentId;
    }
    if (dto.unitType !== undefined) data.unitType = dto.unitType;
    if (dto.unitCode !== undefined) data.unitCode = dto.unitCode;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.downPaymentPct !== undefined) {
      data.downPaymentPct = dto.downPaymentPct;
    }
    if (dto.paymentPlan !== undefined) data.paymentPlan = dto.paymentPlan;
    if (dto.commissionPct !== undefined) data.commissionPct = dto.commissionPct;
    if (dto.notes !== undefined) data.notes = dto.notes;

    // Amount typed by hand wins; otherwise follow price × pct.
    if (dto.commissionAmount !== undefined) {
      data.commissionAmount = dto.commissionAmount;
    } else if (dto.price !== undefined || dto.commissionPct !== undefined) {
      const price = dto.price ?? Number(deal.price);
      const pct =
        dto.commissionPct !== undefined
          ? dto.commissionPct
          : deal.commissionPct === null
            ? null
            : Number(deal.commissionPct);
      if (pct !== null) data.commissionAmount = computeCommission(price, pct);
    }

    const reservedAt = dto.reservedAt ?? deal.reservedAt;
    if (dto.reservedAt !== undefined) {
      this.recorder.assertNotFuture(dto.reservedAt, now, 'Reservation date');
      data.reservedAt = dto.reservedAt;
    }
    if (dto.contractedAt !== undefined) {
      if (deal.status !== DealStatus.CONTRACTED) {
        throw new BadRequestException(
          'Mark the deal contracted before setting a contract date',
        );
      }
      this.recorder.assertNotFuture(dto.contractedAt, now, 'Contract date');
      data.contractedAt = dto.contractedAt;
    }
    const contractedAt = dto.contractedAt ?? deal.contractedAt;
    if (contractedAt && contractedAt.getTime() < reservedAt.getTime()) {
      throw new BadRequestException(
        'The contract date cannot be before the reservation date',
      );
    }
    if (
      dto.expectedContractAt !== undefined &&
      (dto.expectedContractAt?.getTime() ?? null) !==
        (deal.expectedContractAt?.getTime() ?? null)
    ) {
      if (deal.status !== DealStatus.RESERVED) {
        throw new BadRequestException(
          'Only a reserved deal has an expected contract date',
        );
      }
      data.expectedContractAt = dto.expectedContractAt;
    }
    if (deal.status === DealStatus.RESERVED) {
      this.recorder.assertContractAfterReservation(
        dto.expectedContractAt !== undefined
          ? dto.expectedContractAt
          : deal.expectedContractAt,
        reservedAt,
      );
    }

    const changedFields = this.changedFields(deal, data);
    if (changedFields.length === 0) return toDealResponse(deal);
    const deadlineChanged =
      changedFields.includes('expectedContractAt') ||
      changedFields.includes('reservedAt');
    const agentChanged = changedFields.includes('agentId');

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.deal.update({
        where: { id: deal.id },
        data,
        select: dealSelect,
      });
      const metadata = {
        dealId: deal.id,
        changedFields,
        price: Number(record.price),
        currency: record.currency,
      };
      await this.leadActivity.createActivity(
        {
          tenantId,
          leadId: deal.leadId,
          actorUserId,
          eventType: LeadActivityEventType.DEAL_UPDATED,
          metadata,
        },
        tx,
      );
      await this.auditWriter.createAuditLog({
        tx,
        tenantId,
        actorUserId,
        action: DEAL_AUDIT_ACTIONS.UPDATED,
        entityType: DEAL_AUDIT_ENTITY_TYPE,
        entityId: deal.id,
        metadata: { leadId: deal.leadId, ...metadata },
      });
      // R10/R11 follow the new contract date and the new agent.
      if (deadlineChanged || agentChanged) {
        await this.dealRules.onDealEdited(
          tx,
          {
            tenantId,
            leadId: deal.leadId,
            status: record.status,
            reservedAt: record.reservedAt,
            expectedContractAt: record.expectedContractAt,
          },
          {
            deadlineChanged,
            newAgentId: agentChanged ? (record.agent?.id ?? null) : undefined,
          },
        );
      }
      return record;
    });

    void this.events.publish(new LeadUpdatedEvent(tenantId, deal.leadId));
    if (agentChanged) void this.events.publish(new TasksChangedEvent(tenantId));
    this.refreshStats(tenantId, deal, updated);
    return toDealResponse(updated);
  }

  async contract(
    tenantId: string,
    actorUserId: string,
    dealId: string,
    dto: ContractDealDto,
    scope: LeadScope,
  ): Promise<DealResponse> {
    const deal = await this.getRecordOrThrow(tenantId, dealId, scope);
    if (deal.status !== DealStatus.RESERVED) {
      throw new BadRequestException('Only reserved deals can be contracted');
    }
    const now = new Date();
    const contractedAt = dto.contractedAt ?? now;
    this.recorder.assertNotFuture(contractedAt, now, 'Contract date');
    if (contractedAt.getTime() < deal.reservedAt.getTime()) {
      throw new BadRequestException(
        'The contract date cannot be before the reservation date',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Guarded on status so a concurrent cancel cannot be overwritten.
      const { count } = await tx.deal.updateMany({
        where: { id: deal.id, status: DealStatus.RESERVED },
        data: { status: DealStatus.CONTRACTED, contractedAt },
      });
      if (count === 0) {
        throw new BadRequestException('Only reserved deals can be contracted');
      }
      // R10: the paperwork is done.
      await this.dealRules.onDealContracted(tx, deal.leadId, now);
      const metadata = {
        dealId: deal.id,
        price: Number(deal.price),
        currency: deal.currency,
        contractedAt: contractedAt.toISOString(),
      };
      await this.leadActivity.createActivity(
        {
          tenantId,
          leadId: deal.leadId,
          actorUserId,
          eventType: LeadActivityEventType.DEAL_CONTRACTED,
          metadata,
        },
        tx,
      );
      await this.auditWriter.createAuditLog({
        tx,
        tenantId,
        actorUserId,
        action: DEAL_AUDIT_ACTIONS.CONTRACTED,
        entityType: DEAL_AUDIT_ENTITY_TYPE,
        entityId: deal.id,
        metadata: { leadId: deal.leadId, ...metadata },
      });
      return tx.deal.findUniqueOrThrow({
        where: { id: deal.id },
        select: dealSelect,
      });
    });

    void this.events.publish(new LeadUpdatedEvent(tenantId, deal.leadId));
    void this.events.publish(new TasksChangedEvent(tenantId));
    this.refreshStats(tenantId, deal, updated);
    return toDealResponse(updated);
  }

  /**
   * Cancels the deal and re-opens the lead in the open stage it was won from
   * (same stage-move internals as a manual reopen: timeline, events, rules).
   */
  async cancel(
    tenantId: string,
    actorUserId: string,
    dealId: string,
    dto: CancelDealDto,
    scope: LeadScope,
  ): Promise<DealResponse> {
    const deal = await this.getRecordOrThrow(tenantId, dealId, scope);
    if (deal.status === DealStatus.CANCELLED) {
      throw new BadRequestException('This deal is already cancelled');
    }
    const now = new Date();

    const { record, reopen } = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.deal.updateMany({
        where: { id: deal.id, status: { not: DealStatus.CANCELLED } },
        data: {
          status: DealStatus.CANCELLED,
          cancelledAt: now,
          cancelReason: dto.reason,
        },
      });
      if (count === 0) {
        throw new BadRequestException('This deal is already cancelled');
      }
      const metadata = {
        dealId: deal.id,
        previousStatus: deal.status,
        reason: dto.reason,
        price: Number(deal.price),
        currency: deal.currency,
      };
      await this.leadActivity.createActivity(
        {
          tenantId,
          leadId: deal.leadId,
          actorUserId,
          eventType: LeadActivityEventType.DEAL_CANCELLED,
          metadata,
        },
        tx,
      );
      // R10/R11 tasks of this deal no longer apply.
      await this.dealRules.onDealCancelled(tx, deal.leadId, now);
      const moved = await this.leadStage.reopenWonLeadInTx(tx, {
        tenantId,
        actorUserId,
        leadId: deal.leadId,
        dealId: deal.id,
        now,
      });
      await this.auditWriter.createAuditLog({
        tx,
        tenantId,
        actorUserId,
        action: DEAL_AUDIT_ACTIONS.CANCELLED,
        entityType: DEAL_AUDIT_ENTITY_TYPE,
        entityId: deal.id,
        metadata: {
          leadId: deal.leadId,
          ...metadata,
          reopenedToStageId: moved?.targetStage.id ?? null,
          reopenedToStageName: moved?.targetStage.name ?? null,
        },
      });
      const cancelled = await tx.deal.findUniqueOrThrow({
        where: { id: deal.id },
        select: dealSelect,
      });
      return { record: cancelled, reopen: moved };
    });

    if (reopen) {
      await this.leadStage.afterStageMove(
        tenantId,
        deal.leadId,
        actorUserId,
        reopen,
      );
    } else {
      void this.events.publish(new LeadUpdatedEvent(tenantId, deal.leadId));
    }
    void this.events.publish(new TasksChangedEvent(tenantId));
    this.refreshStats(tenantId, deal, record);
    return toDealResponse(record);
  }

  /** Days this deal was counted on are recomputed in the background. */
  private refreshStats(
    tenantId: string,
    ...records: Array<
      Pick<DealRecord, 'reservedAt' | 'contractedAt' | 'cancelledAt' | 'agent'>
    >
  ): void {
    void this.dailyStats.recomputeForDeal(
      tenantId,
      records.map((record) => ({
        agentId: record.agent?.id ?? null,
        reservedAt: record.reservedAt,
        contractedAt: record.contractedAt,
        cancelledAt: record.cancelledAt,
      })),
    );
  }

  private buildWhere(
    tenantId: string,
    query: GetDealsQueryDto,
    scope: LeadScope,
  ): Prisma.DealWhereInput {
    const and: Prisma.DealWhereInput[] = [];
    if (query.from || query.to) {
      const range: Prisma.DateTimeFilter = {
        ...(query.from ? { gte: query.from } : {}),
        ...(query.to ? { lt: query.to } : {}),
      };
      const field = query.periodField ?? 'any';
      and.push(
        field === 'any'
          ? { OR: [{ reservedAt: range }, { contractedAt: range }] }
          : { [field]: range },
      );
    }

    return {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.agentId ? { agentId: query.agentId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      lead: {
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
        ...(query.search
          ? { fullName: { contains: query.search, mode: 'insensitive' } }
          : {}),
      },
      ...(and.length ? { AND: and } : {}),
    };
  }

  private async getRecordOrThrow(
    tenantId: string,
    dealId: string,
    scope: LeadScope,
  ): Promise<DealRecord> {
    // Out of scope behaves exactly like missing.
    const deal = await this.prisma.deal.findFirst({
      where: {
        id: dealId,
        tenantId,
        lead: { tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      },
      select: dealSelect,
    });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  private changedFields(
    deal: DealRecord,
    data: Prisma.DealUncheckedUpdateInput,
  ): EditableField[] {
    const current: Record<EditableField, unknown> = {
      projectId: deal.project?.id ?? null,
      unitType: deal.unitType,
      unitCode: deal.unitCode,
      price: Number(deal.price),
      downPaymentPct: this.toNumber(deal.downPaymentPct),
      paymentPlan: deal.paymentPlan,
      commissionPct: this.toNumber(deal.commissionPct),
      commissionAmount: this.toNumber(deal.commissionAmount),
      agentId: deal.agent?.id ?? null,
      reservedAt: deal.reservedAt.getTime(),
      expectedContractAt: deal.expectedContractAt?.getTime() ?? null,
      contractedAt: deal.contractedAt?.getTime() ?? null,
      notes: deal.notes,
    };
    return EDITABLE_FIELDS.filter((field) => {
      if (!(field in data)) return false;
      const next: unknown = data[field];
      const normalized = next instanceof Date ? next.getTime() : next;
      return normalized !== current[field];
    });
  }

  private toNumber(value: Prisma.Decimal | null): number | null {
    return value === null ? null : Number(value);
  }

  private async assertPermission(
    tenantId: string,
    actorUserId: string,
    permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
    message: string,
  ): Promise<void> {
    const keys = await this.permissions.getPermissionKeysForUser(
      actorUserId,
      tenantId,
    );
    if (!keys.has(permission)) throw new ForbiddenException(message);
  }
}
