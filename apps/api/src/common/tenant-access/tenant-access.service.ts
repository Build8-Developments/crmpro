import { Injectable } from '@nestjs/common';
import {
  ContractStatus,
  ContractTerminationMode,
  TenantStatus,
} from '@crmpro/database';
import { isWithinContractGrace } from '@crmpro/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESSIBLE_TENANT_STATUSES,
  TENANT_ACCESS_MESSAGES,
  TENANT_ACCESS_STATE_CACHE_TTL_MS,
} from './tenant-access.constants';
import { TenantInactiveException } from './tenant-access.exception';

const contractAccessSelect = {
  status: true,
  contractEndAt: true,
  gracePeriodDays: true,
  updatedAt: true,
  terminationMode: true,
  accessEndsAt: true,
} as const;

/**
 * What an accessible tenant may do. `readOnly` is true while a contract
 * terminated in READ_ONLY mode winds down; `accessEndsAt` is when a
 * terminated contract stops giving access (null when nothing is ending).
 */
export type TenantAccessState = {
  readOnly: boolean;
  accessEndsAt: Date | null;
};

const FULL_ACCESS_STATE: TenantAccessState = {
  readOnly: false,
  accessEndsAt: null,
};

@Injectable()
export class TenantAccessService {
  /** Per-process, short-lived: checked on every write request. */
  private readonly stateCache = new Map<
    string,
    { state: TenantAccessState; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async assertTenantAccessible(tenantId: string): Promise<void> {
    await this.getTenantAccessState(tenantId);
  }

  /**
   * Throws TenantInactiveException when the tenant may not be used at all
   * (suspended, inactive, contract lapsed); otherwise says whether it is
   * read-only. Always reads the database.
   */
  async getTenantAccessState(tenantId: string): Promise<TenantAccessState> {
    const tenant = await this.loadTenant(tenantId);

    if (!tenant) {
      throw new TenantInactiveException(TENANT_ACCESS_MESSAGES.INACTIVE);
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new TenantInactiveException(TENANT_ACCESS_MESSAGES.SUSPENDED);
    }

    if (!ACCESSIBLE_TENANT_STATUSES.has(tenant.status)) {
      throw new TenantInactiveException(TENANT_ACCESS_MESSAGES.INACTIVE);
    }

    const state = await this.resolveBillingAccess(tenantId);
    this.remember(tenantId, state);
    return state;
  }

  /**
   * Same as getTenantAccessState, cached for a few seconds per process.
   * A termination made in the admin takes effect within the TTL.
   */
  async getCachedTenantAccessState(
    tenantId: string,
  ): Promise<TenantAccessState> {
    const cached = this.stateCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.state;
    }

    return this.getTenantAccessState(tenantId);
  }

  private remember(tenantId: string, state: TenantAccessState): void {
    this.stateCache.set(tenantId, {
      state,
      expiresAt: Date.now() + TENANT_ACCESS_STATE_CACHE_TTL_MS,
    });
  }

  private async resolveBillingAccess(
    tenantId: string,
  ): Promise<TenantAccessState> {
    const now = new Date();

    const activeContract = await this.prisma.tenantContract.findFirst({
      where: {
        tenantId,
        status: ContractStatus.ACTIVE,
        deletedAt: null,
      },
      select: contractAccessSelect,
      orderBy: { createdAt: 'desc' },
    });

    if (activeContract && isWithinContractGrace(activeContract, { now })) {
      return FULL_ACCESS_STATE;
    }

    const lapsedContract = await this.prisma.tenantContract.findFirst({
      where: {
        tenantId,
        status: { in: [ContractStatus.TERMINATED, ContractStatus.EXPIRED] },
        deletedAt: null,
      },
      select: contractAccessSelect,
      orderBy: { updatedAt: 'desc' },
    });

    if (lapsedContract) {
      const state = this.lapsedContractAccess(lapsedContract, now);
      if (state) {
        return state;
      }
    }

    // Never contracted (e.g. a fresh TRIAL tenant) is not a billing lapse.
    if (!activeContract && !lapsedContract) {
      return FULL_ACCESS_STATE;
    }

    throw new TenantInactiveException(TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED);
  }

  /** Access left on a terminated/expired contract, or null when it's over. */
  private lapsedContractAccess(
    contract: {
      status: ContractStatus;
      contractEndAt: Date | null;
      gracePeriodDays: number | null;
      updatedAt: Date;
      terminationMode: ContractTerminationMode | null;
      accessEndsAt: Date | null;
    },
    now: Date,
  ): TenantAccessState | null {
    // Terminations record when access ends (end + grace, or the moment itself
    // for IMMEDIATE); the mode says what is allowed until then.
    if (
      contract.status === ContractStatus.TERMINATED &&
      contract.accessEndsAt
    ) {
      if (now.getTime() > contract.accessEndsAt.getTime()) {
        return null;
      }
      return {
        readOnly:
          contract.terminationMode === ContractTerminationMode.READ_ONLY,
        accessEndsAt: contract.accessEndsAt,
      };
    }

    // Expired contracts (and terminations recorded before modes existed):
    // full use through end + grace.
    const withinGrace = isWithinContractGrace(contract, {
      now,
      referenceDate: contract.updatedAt,
    });
    return withinGrace ? FULL_ACCESS_STATE : null;
  }

  private async loadTenant(tenantId: string) {
    return this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
  }
}
