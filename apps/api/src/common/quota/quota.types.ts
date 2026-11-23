import type { Prisma } from '@crmpro/database';

/** null = unlimited. */
export type TenantPlanLimits = {
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
  maxStorageBytes: bigint | null;
};

export type TenantQuotaContext = TenantPlanLimits & {
  storageUsedBytes: bigint;
};

export type QuotaTransactionClient = Prisma.TransactionClient;
