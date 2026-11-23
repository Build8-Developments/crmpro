import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContractStatus,
  ContractTerminationMode,
  Prisma,
  TenantStatus,
} from '@crmpro/database';
import {
  buildPlanSnapshot,
  computeTerminationAccessEndsAt,
} from '@crmpro/shared/billing';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/pagination/utils/pagination.util';
import type { PaginatedResponse } from '../../common/pagination/types/paginated-response.type';
import type { RequestSecurityMetadata } from '../auth/auth.types';
import { CreateContractDto } from './dto/create-contract.dto';
import { GetContractsQueryDto } from './dto/get-contracts-query.dto';
import { TerminateContractDto } from './dto/terminate-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ContractsAuditService } from './services/contracts-audit.service';
import { ContractEntitlementSyncService } from './services/contract-entitlement-sync.service';
import type { ContractDetail, ContractListItem } from './types/contract.types';
import { toContractDetail, toContractListItem } from './utils/contract.mapper';
import { revokeTenantUserSessionsInTx } from '../tenants/utils/tenant-sessions.util';

type PrismaTx = Prisma.TransactionClient;

const contractInclude = {
  plan: {
    select: {
      id: true,
      name: true,
      isActive: true,
      maxUsers: true,
      maxLeads: true,
      maxProjects: true,
      maxStorageBytes: true,
      featureFlags: true,
    },
  },
  createdByAdmin: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.TenantContractInclude;

/** Terms frozen in the plan snapshot: changing them means a new contract. */
const SIGNED_TERM_FIELDS = ['planId', 'agreedPrice', 'currency'] as const;

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: ContractsAuditService,
    private readonly entitlementSyncService: ContractEntitlementSyncService,
  ) {}

  async listContracts(
    query: GetContractsQueryDto,
  ): Promise<PaginatedResponse<ContractListItem>> {
    const { page, limit, skip, take } = getPaginationParams(query);

    const where: Prisma.TenantContractWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.currency ? { currency: query.currency } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.paymentFrequency
        ? { paymentFrequency: query.paymentFrequency }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                contractName: { contains: query.search, mode: 'insensitive' },
              },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [totalItems, contracts] = await this.prisma.$transaction([
      this.prisma.tenantContract.count({ where }),
      this.prisma.tenantContract.findMany({
        where,
        include: contractInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return buildPaginatedResponse(
      contracts.map(toContractListItem),
      page,
      limit,
      totalItems,
    );
  }

  async getContractById(id: string): Promise<ContractDetail> {
    const contract = await this.findContractOrThrow(id);
    return toContractDetail(contract);
  }

  async createContract(
    dto: CreateContractDto,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<ContractDetail> {
    await this.assertPlanActive(dto.planId);
    this.assertDateRange(dto.contractStartAt, dto.contractEndAt);

    // Audit is written in the same transaction: no audit row, no contract.
    const contract = await this.prisma.$transaction(async (tx) => {
      // Drafts carry a preview of the terms; activation captures them again.
      const planSnapshot = await this.capturePlanSnapshot(tx, dto.planId, {
        agreedPrice: dto.agreedPrice,
        currency: dto.currency,
      });

      const created = await tx.tenantContract.create({
        data: {
          contractName: dto.contractName ?? null,
          planId: dto.planId,
          planSnapshot,
          agreedPrice: dto.agreedPrice,
          currency: dto.currency,
          paymentMethod: dto.paymentMethod,
          paymentFrequency: dto.paymentFrequency,
          contractStartAt: new Date(dto.contractStartAt),
          contractEndAt: dto.contractEndAt ? new Date(dto.contractEndAt) : null,
          discountPercent: dto.discountPercent ?? null,
          gracePeriodDays: dto.gracePeriodDays ?? null,
          autoRenew: dto.autoRenew ?? false,
          notes: dto.notes ?? null,
          status: ContractStatus.DRAFT,
          createdByAdminId: actorAdminId,
        },
        include: contractInclude,
      });

      await this.auditService.logContractCreated(
        actorAdminId,
        created.id,
        metadata,
        {
          contractName: created.contractName,
          planId: created.planId,
          agreedPrice: dto.agreedPrice,
          currency: dto.currency,
        },
        tx,
      );

      return created;
    });

    return toContractDetail(contract);
  }

  async updateContract(
    id: string,
    dto: UpdateContractDto,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<ContractDetail> {
    const existing = await this.findContractOrThrow(id);
    this.assertEditable(existing);
    this.assertSignedTermsUnchanged(existing, dto);

    if (dto.planId) {
      await this.assertPlanActive(dto.planId);
    }

    const startAt = dto.contractStartAt
      ? dto.contractStartAt
      : existing.contractStartAt.toISOString();
    const endAt =
      dto.contractEndAt !== undefined
        ? dto.contractEndAt
        : existing.contractEndAt?.toISOString();
    this.assertDateRange(startAt, endAt ?? undefined);

    const recapture =
      existing.status === ContractStatus.DRAFT &&
      this.changesSignedTerms(existing, dto);

    const contract = await this.prisma.$transaction(async (tx) => {
      const planSnapshot = recapture
        ? await this.capturePlanSnapshot(tx, dto.planId ?? existing.planId, {
            agreedPrice: dto.agreedPrice ?? existing.agreedPrice,
            currency: dto.currency ?? existing.currency,
          })
        : undefined;

      const updated = await tx.tenantContract.update({
        where: { id },
        data: {
          ...(planSnapshot !== undefined ? { planSnapshot } : {}),
          ...(dto.contractName !== undefined
            ? { contractName: dto.contractName }
            : {}),
          ...(dto.planId !== undefined ? { planId: dto.planId } : {}),
          ...(dto.agreedPrice !== undefined
            ? { agreedPrice: dto.agreedPrice }
            : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.paymentMethod !== undefined
            ? { paymentMethod: dto.paymentMethod }
            : {}),
          ...(dto.paymentFrequency !== undefined
            ? { paymentFrequency: dto.paymentFrequency }
            : {}),
          ...(dto.contractStartAt !== undefined
            ? { contractStartAt: new Date(dto.contractStartAt) }
            : {}),
          ...(dto.contractEndAt !== undefined
            ? {
                contractEndAt: dto.contractEndAt
                  ? new Date(dto.contractEndAt)
                  : null,
              }
            : {}),
          ...(dto.discountPercent !== undefined
            ? { discountPercent: dto.discountPercent }
            : {}),
          ...(dto.gracePeriodDays !== undefined
            ? { gracePeriodDays: dto.gracePeriodDays }
            : {}),
          ...(dto.autoRenew !== undefined ? { autoRenew: dto.autoRenew } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
        include: contractInclude,
      });

      if (
        updated.status === ContractStatus.ACTIVE &&
        updated.tenantId !== null
      ) {
        await this.entitlementSyncService.syncTenantPlanFromContract(
          tx,
          updated.tenantId,
          updated.planId,
        );
        await this.entitlementSyncService.assertTenantContractPlanConsistency(
          updated.tenantId,
          tx,
        );
      }

      const changes = this.collectChanges(existing, dto);
      if (Object.keys(changes).length > 0) {
        await this.auditService.logContractUpdated(
          actorAdminId,
          id,
          metadata,
          changes,
          tx,
        );
      }

      return updated;
    });

    return toContractDetail(contract);
  }

  async activateContract(
    id: string,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<ContractDetail> {
    const existing = await this.findContractOrThrow(id);

    if (existing.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be activated');
    }

    await this.assertPlanActive(existing.planId);

    if (existing.tenantId) {
      await this.assertTenantHasNoActiveContract(existing.tenantId, id);
    }

    const contract = await this.prisma.$transaction(async (tx) => {
      // Signing: freeze the plan as it is now. Never re-captured afterwards.
      const planSnapshot = await this.capturePlanSnapshot(
        tx,
        existing.planId,
        existing,
      );

      const updated = await tx.tenantContract.update({
        where: { id },
        data: { status: ContractStatus.ACTIVE, planSnapshot },
        include: contractInclude,
      });

      if (updated.tenantId) {
        await this.entitlementSyncService.syncTenantPlanFromContract(
          tx,
          updated.tenantId,
          updated.planId,
        );
        await this.entitlementSyncService.assertTenantContractPlanConsistency(
          updated.tenantId,
          tx,
        );
      }

      await this.auditService.logContractActivated(
        actorAdminId,
        id,
        metadata,
        tx,
      );

      return updated;
    });

    return toContractDetail(contract);
  }

  async terminateContract(
    id: string,
    dto: TerminateContractDto,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<ContractDetail> {
    const existing = await this.findContractOrThrow(id);

    if (existing.status === ContractStatus.TERMINATED) {
      throw new BadRequestException('Contract is already terminated');
    }

    if (
      existing.status !== ContractStatus.ACTIVE &&
      existing.status !== ContractStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'Only active or expired contracts can be terminated',
      );
    }

    const mode = dto.mode;
    const terminatedAt = new Date();
    const accessEndsAt = computeTerminationAccessEndsAt(
      mode,
      {
        contractEndAt: existing.contractEndAt,
        gracePeriodDays: existing.gracePeriodDays,
      },
      terminatedAt,
    );
    const reason = dto.reason?.trim() || null;

    // One transaction: contract, tenant suspension, sessions and audit rows
    // all land together or not at all.
    const contract = await this.prisma.$transaction(async (tx) => {
      const terminated = await tx.tenantContract.update({
        where: { id },
        data: {
          status: ContractStatus.TERMINATED,
          terminatedAt,
          terminationMode: mode,
          accessEndsAt,
        },
        include: contractInclude,
      });

      let revokedSessions = 0;
      const suspendTenant =
        mode === ContractTerminationMode.IMMEDIATE &&
        existing.tenantId !== null;

      if (suspendTenant && existing.tenantId) {
        revokedSessions = await this.suspendTenantNow(
          tx,
          existing.tenantId,
          terminatedAt,
        );
        await this.auditService.logTenantSuspendedByTermination(
          actorAdminId,
          existing.tenantId,
          metadata,
          { contractId: id, revokedSessions },
          tx,
        );
      }

      await this.auditService.logContractTerminated(
        actorAdminId,
        id,
        metadata,
        {
          tenantId: existing.tenantId,
          mode,
          reason,
          terminatedAt: terminatedAt.toISOString(),
          accessEndsAt: accessEndsAt.toISOString(),
          gracePeriodDays: existing.gracePeriodDays,
          tenantSuspended: suspendTenant,
          revokedSessions,
        },
        tx,
      );

      return terminated;
    });

    return toContractDetail(contract);
  }

  async archiveContract(
    id: string,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<{ success: true }> {
    const existing = await this.findContractOrThrow(id);

    if (existing.status === ContractStatus.ACTIVE) {
      throw new BadRequestException('Cannot archive an active contract');
    }

    if (
      existing.status !== ContractStatus.DRAFT &&
      existing.status !== ContractStatus.TERMINATED &&
      existing.status !== ContractStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'Only draft, terminated, or expired contracts can be archived',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenantContract.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.auditService.logContractArchived(
        actorAdminId,
        id,
        metadata,
        tx,
      );
    });

    return { success: true };
  }

  /**
   * Future invariant: a tenant may have at most one ACTIVE contract.
   * Call when activating a contract or assigning a tenant.
   */
  async assertTenantHasNoActiveContract(
    tenantId: string,
    excludeContractId?: string,
  ): Promise<void> {
    const existing = await this.prisma.tenantContract.findFirst({
      where: {
        tenantId,
        status: ContractStatus.ACTIVE,
        deletedAt: null,
        ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Tenant already has an active contract');
    }
  }

  /** IMMEDIATE termination: suspend the tenant and sign everyone out. */
  private async suspendTenantNow(
    tx: PrismaTx,
    tenantId: string,
    now: Date,
  ): Promise<number> {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.SUSPENDED },
    });

    return revokeTenantUserSessionsInTx(tx, tenantId, now);
  }

  private async capturePlanSnapshot(
    tx: PrismaTx,
    planId: string,
    terms: {
      agreedPrice: Prisma.Decimal | number;
      currency: string;
    },
  ): Promise<Prisma.InputJsonValue> {
    const plan = await tx.subscriptionPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        name: true,
        maxUsers: true,
        maxLeads: true,
        maxProjects: true,
        maxStorageBytes: true,
        featureFlags: true,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return buildPlanSnapshot(plan, terms);
  }

  private changesSignedTerms(
    existing: Awaited<ReturnType<typeof this.findContractOrThrow>>,
    dto: UpdateContractDto,
  ): boolean {
    return SIGNED_TERM_FIELDS.some((field) => {
      if (dto[field] === undefined) return false;
      if (field === 'agreedPrice') {
        return dto.agreedPrice !== existing.agreedPrice.toNumber();
      }
      return dto[field] !== existing[field];
    });
  }

  /** Plan, price and currency are frozen once the contract is signed. */
  private assertSignedTermsUnchanged(
    existing: Awaited<ReturnType<typeof this.findContractOrThrow>>,
    dto: UpdateContractDto,
  ): void {
    if (existing.status === ContractStatus.DRAFT) {
      return;
    }

    if (this.changesSignedTerms(existing, dto)) {
      throw new BadRequestException(
        'Plan, price and currency of a signed contract cannot change. Terminate it and create a new contract.',
      );
    }
  }

  private async findContractOrThrow(id: string) {
    const contract = await this.prisma.tenantContract.findFirst({
      where: { id, deletedAt: null },
      include: contractInclude,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  private assertEditable(contract: {
    status: ContractStatus;
    deletedAt: Date | null;
  }): void {
    if (contract.deletedAt !== null) {
      throw new BadRequestException('Cannot update an archived contract');
    }

    if (contract.status === ContractStatus.TERMINATED) {
      throw new BadRequestException('Cannot update a terminated contract');
    }
  }

  private async assertPlanActive(planId: string): Promise<void> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true, isActive: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    if (!plan.isActive) {
      throw new BadRequestException('Plan must be active');
    }
  }

  private assertDateRange(startAt: string, endAt?: string): void {
    const start = new Date(startAt);

    if (endAt) {
      const end = new Date(endAt);
      if (end <= start) {
        throw new BadRequestException(
          'Contract end date must be after start date',
        );
      }
    }
  }

  private collectChanges(
    existing: Awaited<ReturnType<typeof this.findContractOrThrow>>,
    dto: UpdateContractDto,
  ): Record<string, unknown> {
    const changes: Record<string, unknown> = {};

    if (
      dto.contractName !== undefined &&
      dto.contractName !== existing.contractName
    ) {
      changes.contractName = dto.contractName;
    }
    if (dto.planId !== undefined && dto.planId !== existing.planId) {
      changes.planId = dto.planId;
    }
    if (dto.agreedPrice !== undefined) {
      const current = existing.agreedPrice.toNumber();
      if (dto.agreedPrice !== current) {
        changes.agreedPrice = dto.agreedPrice;
      }
    }
    if (dto.currency !== undefined && dto.currency !== existing.currency) {
      changes.currency = dto.currency;
    }
    if (
      dto.paymentMethod !== undefined &&
      dto.paymentMethod !== existing.paymentMethod
    ) {
      changes.paymentMethod = dto.paymentMethod;
    }
    if (
      dto.paymentFrequency !== undefined &&
      dto.paymentFrequency !== existing.paymentFrequency
    ) {
      changes.paymentFrequency = dto.paymentFrequency;
    }
    if (dto.discountPercent !== undefined) {
      changes.discountPercent = dto.discountPercent;
    }
    if (dto.gracePeriodDays !== undefined) {
      changes.gracePeriodDays = dto.gracePeriodDays;
    }
    if (dto.autoRenew !== undefined && dto.autoRenew !== existing.autoRenew) {
      changes.autoRenew = dto.autoRenew;
    }
    if (dto.notes !== undefined && dto.notes !== existing.notes) {
      changes.notes = dto.notes;
    }

    return changes;
  }
}
