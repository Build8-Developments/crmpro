import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export interface PlanFeatureFlags {
  analytics?: boolean;
  importExport?: boolean;
  apiAccess?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
  [key: string]: boolean | undefined;
}

export interface PlanListItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  currency: string | null;
  defaultPrice: number | null;
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
  maxStorageBytes: number | null;
  featureFlags: PlanFeatureFlags;
  createdAt: string;
}

export interface PlanDetail extends PlanListItem {
  tenantCount: number;
  updatedAt: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  defaultPrice?: number;
  currency?: string;
  maxUsers?: number | null;
  maxLeads?: number | null;
  maxProjects?: number | null;
  maxStorageBytes?: number | null;
  featureFlags?: Record<string, boolean>;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  defaultPrice?: number | null;
  currency?: string | null;
  maxUsers?: number | null;
  maxLeads?: number | null;
  maxProjects?: number | null;
  maxStorageBytes?: number | null;
  featureFlags?: Record<string, boolean>;
}

export type PlansListParams = ListQueryParams & {
  isActive?: boolean;
  currency?: string;
};

export type PlansListResponse = PaginatedResponse<PlanListItem>;

export type PlanStatusFilter = "all" | "active" | "inactive";

export const PLAN_FEATURE_FLAG_OPTIONS = [
  { key: "analytics", label: "Analytics" },
  { key: "importExport", label: "Import / Export" },
  { key: "apiAccess", label: "API access" },
  { key: "customBranding", label: "Custom branding" },
  { key: "prioritySupport", label: "Priority support" },
] as const;

export const PLAN_CURRENCY_OPTIONS = ["EGP", "USD", "AED", "SAR"] as const;
