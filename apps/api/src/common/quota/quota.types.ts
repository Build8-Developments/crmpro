import type { Prisma } from '@crmpro/database';

export type TenantPlanLimits = {
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
};

export type TenantQuotaContext = TenantPlanLimits & {
  storageUsedBytes: bigint;
  maxStorageBytes: bigint | null;
};

export type QuotaTransactionClient = Prisma.TransactionClient;
