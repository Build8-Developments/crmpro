import { Logger } from '@nestjs/common';
import { ContractStatus, Prisma } from '@crmpro/database';
import {
  parsePlanSnapshot,
  resolvePlanTerms,
  type ResolvedPlanTerms,
} from '@crmpro/shared/billing';

type PrismaClientLike = Prisma.TransactionClient;

const logger = new Logger('TenantPlanTerms');

const LAPSED_STATUSES = [ContractStatus.TERMINATED, ContractStatus.EXPIRED];

/**
 * The quotas and flags a tenant actually has: the snapshot of its current
 * contract (the active one, else the latest terminated/expired one still
 * winding down), with flags added to the plan later taken from the live plan.
 * Falls back to the live plan only for legacy contracts without a snapshot.
 *
 * Mirrors apps/api TenantPlanResolver so admin screens show what the tenant
 * is enforced against.
 */
export async function resolveTenantPlanTerms(
  client: PrismaClientLike,
  tenantId: string,
  livePlan: {
    maxUsers: number | null;
    maxLeads: number | null;
    maxProjects: number | null;
    maxStorageBytes: bigint | null;
    featureFlags: Prisma.JsonValue;
  },
): Promise<ResolvedPlanTerms> {
  const contract =
    (await client.tenantContract.findFirst({
      where: { tenantId, status: ContractStatus.ACTIVE, deletedAt: null },
      select: { id: true, planSnapshot: true },
      orderBy: { createdAt: 'desc' },
    })) ??
    (await client.tenantContract.findFirst({
      where: { tenantId, status: { in: LAPSED_STATUSES }, deletedAt: null },
      select: { id: true, planSnapshot: true },
      orderBy: { updatedAt: 'desc' },
    }));

  const snapshot = contract
    ? parsePlanSnapshot(contract.planSnapshot, (issue) =>
        logger.warn(`Contract ${contract.id} plan snapshot: ${issue}`),
      )
    : null;

  return resolvePlanTerms(snapshot, livePlan);
}
