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
  createdAt: Date;
}

export interface PlanDetail extends PlanListItem {
  tenantCount: number;
  updatedAt: Date;
}
