import type { TenantStatus } from '@crmpro/database';

export interface TenantPlanSummary {
  id: string;
  name: string;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  /** The workspace's own host, e.g. https://acme-x7k2.nomow.app; null when not configured. */
  workspaceUrl: string | null;
  status: TenantStatus;
  plan: TenantPlanSummary;
  createdAt: Date;
}

export interface TenantOwnerSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface TenantContractSummary {
  id: string;
  contractName: string | null;
  status: string;
  agreedPrice: number;
  currency: string;
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  /** The workspace's own host, e.g. https://acme-x7k2.nomow.app; null when not configured. */
  workspaceUrl: string | null;
  status: TenantStatus;
  subscriptionPlan: TenantPlanSummary;
  contract: TenantContractSummary | null;
  ownerUser: TenantOwnerSummary | null;
  createdAt: Date;
}

export interface ProvisionTenantResult {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  ownerUser: {
    email: string;
  };
}
