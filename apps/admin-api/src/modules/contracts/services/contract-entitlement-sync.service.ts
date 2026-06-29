import { InternalServerErrorException, Injectable } from '@nestjs/common';
import { ContractStatus, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';

type PrismaTx = Prisma.TransactionClient;

/**
 * Keeps tenant.subscriptionPlanId aligned with the active contract plan.
 *
 * Terminated contracts do not clear tenant.subscriptionPlanId — tenants may
 * still operate during a future grace-period policy; plan entitlement remains
 * until explicitly changed via a new active contract.
 */
@Injectable()
export class ContractEntitlementSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncTenantPlanFromContract(
    tx: PrismaTx,
    tenantId: string,
    planId: string,
  ): Promise<void> {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { subscriptionPlanId: planId },
    });
  }

  async assertTenantContractPlanConsistency(
    tenantId: string,
    tx?: PrismaTx,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    const activeContract = await client.tenantContract.findFirst({
      where: {
        tenantId,
        status: ContractStatus.ACTIVE,
        deletedAt: null,
      },
      select: { planId: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeContract) {
      return;
    }

    const tenant = await client.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { subscriptionPlanId: true },
    });

    if (!tenant) {
      throw new InternalServerErrorException('Tenant not found for contract sync');
    }

    if (tenant.subscriptionPlanId !== activeContract.planId) {
      throw new InternalServerErrorException(
        'Tenant subscription plan is out of sync with active contract',
      );
    }
  }
}
