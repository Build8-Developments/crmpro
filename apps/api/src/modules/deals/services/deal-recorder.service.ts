import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DealStatus, LeadActivityEventType, Prisma } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { PermissionsService } from '../../../common/auth';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import { DealRulesService } from '../../workflow/rules/deal-rules.service';
import { computeCommission } from '../deal.mapper';
import {
  DEAL_AUDIT_ACTIONS,
  DEAL_AUDIT_ENTITY_TYPE,
  DEAL_FUTURE_TOLERANCE_MS,
} from '../deal.constants';
import { DealDetailsDto } from '../dto/deal-details.dto';

/** Everything validated before the stage-move transaction opens. */
export interface PreparedDeal {
  tenantId: string;
  leadId: string;
  actorUserId: string;
  data: {
    projectId: string | null;
    agentId: string | null;
    unitType: string;
    unitCode: string | null;
    price: number;
    currency: string;
    downPaymentPct: number | null;
    paymentPlan: string | null;
    commissionPct: number | null;
    commissionAmount: number | null;
    reservedAt: Date;
    expectedContractAt: Date | null;
    notes: string | null;
  };
  projectName: string | null;
  agentName: string | null;
}

/**
 * Records the deal when a lead is won (spec §2.5). Lives outside the deals
 * HTTP module so the lead stage move can create the deal in its own
 * transaction without a circular module import.
 */
@Injectable()
export class DealRecorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly leadActivity: LeadActivityService,
    private readonly auditWriter: AuditWriterService,
    private readonly dealRules: DealRulesService,
  ) {}

  /** The live (not cancelled) deal of a lead, if any. */
  async findLiveDeal(
    tenantId: string,
    leadId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ id: string; status: DealStatus } | null> {
    return client.deal.findFirst({
      where: { tenantId, leadId, status: { not: DealStatus.CANCELLED } },
      select: { id: true, status: true },
    });
  }

  /**
   * Validates the payload of a move to Won: the actor may record deals, the
   * project and agent exist, and only managers (lead.assign) credit someone
   * other than the lead owner.
   */
  async prepare(
    tenantId: string,
    actorUserId: string,
    lead: { id: string; assignedUserId: string | null },
    dto: DealDetailsDto | undefined,
    now = new Date(),
  ): Promise<PreparedDeal> {
    if (!dto) {
      throw new BadRequestException({
        code: API_ERROR_CODES.DEAL_REQUIRED,
        message: 'Add the deal details (unit type and price) to win this lead.',
      });
    }

    const keys = await this.permissions.getPermissionKeysForUser(
      actorUserId,
      tenantId,
    );
    if (!keys.has(PERMISSIONS.DEAL_WRITE)) {
      throw new ForbiddenException('You cannot record deals');
    }

    // The lead owner gets the credit; an unassigned lead credits the closer.
    const defaultAgentId = lead.assignedUserId ?? actorUserId;
    const agentId = dto.agentId ?? defaultAgentId;
    if (agentId !== defaultAgentId && !keys.has(PERMISSIONS.LEAD_ASSIGN)) {
      throw new ForbiddenException(
        'Only managers can credit the deal to someone else',
      );
    }

    const reservedAt = dto.reservedAt ?? now;
    this.assertNotFuture(reservedAt, now, 'Reservation date');
    const expectedContractAt = dto.expectedContractAt ?? null;
    this.assertContractAfterReservation(expectedContractAt, reservedAt);

    const [project, agent, settings] = await Promise.all([
      dto.projectId ? this.findProject(tenantId, dto.projectId) : null,
      this.findActiveUser(tenantId, agentId),
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { currency: true },
      }),
    ]);
    if (!agent) throw new BadRequestException('Agent not found or inactive');

    const commissionPct = dto.commissionPct ?? null;
    const commissionAmount =
      dto.commissionAmount ??
      (commissionPct !== null
        ? computeCommission(dto.price, commissionPct)
        : null);

    return {
      tenantId,
      leadId: lead.id,
      actorUserId,
      data: {
        projectId: project?.id ?? null,
        agentId: agent.id,
        unitType: dto.unitType,
        unitCode: dto.unitCode ?? null,
        price: dto.price,
        currency: settings?.currency ?? 'EGP',
        downPaymentPct: dto.downPaymentPct ?? null,
        paymentPlan: dto.paymentPlan ?? null,
        commissionPct,
        commissionAmount,
        reservedAt,
        expectedContractAt,
        notes: dto.notes ?? null,
      },
      projectName: project?.name ?? null,
      agentName: agent.name,
    };
  }

  /**
   * Writes the deal, its DEAL_RESERVED activity and the audit row, and gives
   * the agent the paperwork task (R10). Runs after the Won move cancelled the
   * lead's open tasks, so the new task survives.
   */
  async create(
    tx: Prisma.TransactionClient,
    prepared: PreparedDeal,
  ): Promise<{ id: string }> {
    const deal = await tx.deal.create({
      data: {
        tenantId: prepared.tenantId,
        leadId: prepared.leadId,
        createdByUserId: prepared.actorUserId,
        status: DealStatus.RESERVED,
        ...prepared.data,
      },
      select: { id: true },
    });

    const metadata = {
      dealId: deal.id,
      price: prepared.data.price,
      currency: prepared.data.currency,
      unitType: prepared.data.unitType,
      unitCode: prepared.data.unitCode,
      projectId: prepared.data.projectId,
      projectName: prepared.projectName,
      agentId: prepared.data.agentId,
      agentName: prepared.agentName,
      commissionAmount: prepared.data.commissionAmount,
      reservedAt: prepared.data.reservedAt.toISOString(),
      expectedContractAt:
        prepared.data.expectedContractAt?.toISOString() ?? null,
    };

    await this.leadActivity.createActivity(
      {
        tenantId: prepared.tenantId,
        leadId: prepared.leadId,
        actorUserId: prepared.actorUserId,
        eventType: LeadActivityEventType.DEAL_RESERVED,
        metadata,
      },
      tx,
    );
    await this.auditWriter.createAuditLog({
      tx,
      tenantId: prepared.tenantId,
      actorUserId: prepared.actorUserId,
      action: DEAL_AUDIT_ACTIONS.RESERVED,
      entityType: DEAL_AUDIT_ENTITY_TYPE,
      entityId: deal.id,
      metadata: { leadId: prepared.leadId, ...metadata },
    });

    await this.dealRules.onDealReserved(tx, {
      tenantId: prepared.tenantId,
      leadId: prepared.leadId,
      assigneeId: prepared.data.agentId ?? prepared.actorUserId,
      reservedAt: prepared.data.reservedAt,
      expectedContractAt: prepared.data.expectedContractAt,
    });

    return deal;
  }

  async findProject(
    tenantId: string,
    projectId: string,
  ): Promise<{ id: string; name: string }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!project) throw new BadRequestException('Project not found');
    return project;
  }

  async findActiveUser(
    tenantId: string,
    userId: string,
  ): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  /** The expected contract date can be in the future, not before the reservation. */
  assertContractAfterReservation(
    expectedContractAt: Date | null,
    reservedAt: Date,
  ): void {
    if (expectedContractAt && expectedContractAt < reservedAt) {
      throw new BadRequestException(
        'The contract date cannot be before the reservation date',
      );
    }
  }

  assertNotFuture(value: Date, now: Date, label: string): void {
    if (value.getTime() > now.getTime() + DEAL_FUTURE_TOLERANCE_MS) {
      throw new BadRequestException(`${label} cannot be in the future`);
    }
  }
}
