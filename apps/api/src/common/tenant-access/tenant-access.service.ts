import { Injectable } from '@nestjs/common';
import { ContractStatus, TenantStatus } from '@crmpro/database';
import { isWithinContractGrace } from '@crmpro/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TENANT_ACCESS_MESSAGES } from './tenant-access.constants';
import { TenantInactiveException } from './tenant-access.exception';

// TRIAL is the schema default, so tenants created outside provisioning land there.
const ACCESSIBLE_TENANT_STATUSES = new Set<TenantStatus>([
  TenantStatus.ACTIVE,
  TenantStatus.TRIAL,
]);

const contractGraceSelect = {
  contractEndAt: true,
  gracePeriodDays: true,
  updatedAt: true,
} as const;

@Injectable()
export class TenantAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertTenantAccessible(tenantId: string): Promise<void> {
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

    await this.assertTenantBillingAccess(tenantId);
  }

  private async assertTenantBillingAccess(tenantId: string): Promise<void> {
    const activeContract = await this.prisma.tenantContract.findFirst({
      where: {
        tenantId,
        status: ContractStatus.ACTIVE,
        deletedAt: null,
      },
      select: contractGraceSelect,
      orderBy: { createdAt: 'desc' },
    });

    if (
      activeContract &&
      isWithinContractGrace(activeContract, { now: new Date() })
    ) {
      return;
    }

    const lapsedContract = await this.prisma.tenantContract.findFirst({
      where: {
        tenantId,
        status: { in: [ContractStatus.TERMINATED, ContractStatus.EXPIRED] },
        deletedAt: null,
      },
      select: contractGraceSelect,
      orderBy: { updatedAt: 'desc' },
    });

    if (
      lapsedContract &&
      isWithinContractGrace(lapsedContract, {
        now: new Date(),
        referenceDate: lapsedContract.updatedAt,
      })
    ) {
      return;
    }

    // Never contracted (e.g. a fresh TRIAL tenant) is not a billing lapse.
    if (!activeContract && !lapsedContract) {
      return;
    }

    throw new TenantInactiveException(TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED);
  }

  private async loadTenant(tenantId: string) {
    return this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, status: true },
    });
  }
}
