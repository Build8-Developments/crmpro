import { Logger, NotFoundException } from '@nestjs/common';
import { ContractStatus, Prisma } from '@crmpro/database';
import {
  parsePlanSnapshot,
  resolvePlanTerms,
  type PlanSnapshot,
  type ResolvedPlanTerms,
} from '@crmpro/shared/billing';

/** PrismaService or a transaction client. */
type PlanTermsClient = Prisma.TransactionClient;

const logger = new Logger('TenantPlanTerms');

const LAPSED_STATUSES = [ContractStatus.TERMINATED, ContractStatus.EXPIRED];

const contractSnapshotSelect = {
  id: true,
  planSnapshot: true,
} satisfies Prisma.TenantContractSelect;

export type TenantPlanTerms = ResolvedPlanTerms & {
  contractId: string | null;
  snapshot: PlanSnapshot | null;
};

/**
 * What the tenant may do, as signed.
 *
 * The contract in force is the ACTIVE one, else the latest terminated or
 * expired one (a terminated workspace keeps its signed terms while access
 * winds down). Its planSnapshot freezes quotas and the flags that existed at
 * signing; flags added to the plan later come from the live plan. The live
 * plan alone is used only when there is no snapshot (legacy contracts, or a
 * tenant that never had a contract). A malformed snapshot fails closed: see
 * parsePlanSnapshot.
 */
export async function loadTenantPlanTerms(
  client: PlanTermsClient,
  tenantId: string,
): Promise<TenantPlanTerms> {
  // Sequential on purpose: `client` may be an interactive transaction.
  const tenant = await client.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
    select: {
      subscriptionPlan: {
        select: {
          maxUsers: true,
          maxLeads: true,
          maxProjects: true,
          maxStorageBytes: true,
          featureFlags: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new NotFoundException('Tenant not found');
  }

  const contract = await findContractInForce(client, tenantId);

  const snapshot = contract
    ? parsePlanSnapshot(contract.planSnapshot, (issue) =>
        logger.warn(
          `Contract ${contract.id} (tenant ${tenantId}) plan snapshot: ${issue}`,
        ),
      )
    : null;

  return {
    ...resolvePlanTerms(snapshot, tenant.subscriptionPlan),
    contractId: contract?.id ?? null,
    snapshot,
  };
}

async function findContractInForce(client: PlanTermsClient, tenantId: string) {
  const active = await client.tenantContract.findFirst({
    where: { tenantId, status: ContractStatus.ACTIVE, deletedAt: null },
    select: contractSnapshotSelect,
    orderBy: { createdAt: 'desc' },
  });

  if (active) {
    return active;
  }

  return client.tenantContract.findFirst({
    where: { tenantId, status: { in: LAPSED_STATUSES }, deletedAt: null },
    select: contractSnapshotSelect,
    orderBy: { updatedAt: 'desc' },
  });
}
