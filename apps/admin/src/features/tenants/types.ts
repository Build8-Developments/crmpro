import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type TenantStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";

export type TenantStatusFilter = "all" | TenantStatus;

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
  createdAt: string;
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
  createdAt: string;
}

export interface UsageMetric {
  used: number;
  limit: number | null;
}

export interface StorageUsageMetric {
  usedBytes: number;
  limitBytes: number | null;
}

export interface TenantUsage {
  users: UsageMetric;
  leads: UsageMetric;
  projects: UsageMetric;
  storage: StorageUsageMetric;
}

export interface CreateTenantInput {
  contractId: string;
  name: string;
  slug: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
}

export interface CreateTenantResult {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  ownerUser: {
    email: string;
  };
}

export interface UpdateTenantDetailsInput {
  name?: string;
}

export interface UpdateTenantOwnerInput {
  fullName?: string;
  email?: string;
}

export interface ResetTenantOwnerPasswordInput {
  newPassword: string;
}

export type TenantsListParams = ListQueryParams & {
  status?: TenantStatus;
  planId?: string;
};

export type TenantsListResponse = PaginatedResponse<TenantListItem>;

export interface TenantUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string };
}

export type TenantUsersListParams = ListQueryParams;

export type TenantUsersListResponse = PaginatedResponse<TenantUserListItem>;

export interface TenantNoteAuthor {
  id: string;
  fullName: string;
  email: string;
}

export interface TenantNoteItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: TenantNoteAuthor;
}

export interface CreateTenantNoteInput {
  content: string;
}

export interface UpdateTenantNoteInput {
  content: string;
}

/** Minimal contract shape for the create-tenant contract picker. */
export interface ContractOption {
  id: string;
  contractName: string | null;
  status: string;
  planName: string;
  agreedPrice: number;
  currency: string;
}

export type ContractsListResponse = PaginatedResponse<ContractOption>;
