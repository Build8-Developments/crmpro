import type { TenantStatus } from '@crmpro/database';

export interface TenantPlanSummary {
  id: string;
  name: string;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
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
