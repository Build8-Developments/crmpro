import type {
  ContractStatus,
  ContractTerminationMode,
  PaymentFrequency,
  PaymentMethod,
} from '@crmpro/database';
import type { PlanSnapshot } from '@crmpro/shared/billing';

export interface ContractPlanSummary {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ContractAdminSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface ContractListItem {
  id: string;
  contractName: string | null;
  status: ContractStatus;
  tenantId: string | null;
  planName: string;
  agreedPrice: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentFrequency: PaymentFrequency;
  contractStartAt: Date;
  contractEndAt: Date | null;
  gracePeriodDays: number | null;
  autoRenew: boolean;
}

/** The plan as it is today, to compare with what was signed. */
export interface ContractLivePlan {
  id: string;
  name: string;
  isActive: boolean;
  quotas: {
    maxUsers: number | null;
    maxLeads: number | null;
    maxProjects: number | null;
    /** Decimal string, like the snapshot. */
    maxStorageBytes: string | null;
  };
  featureFlags: Record<string, boolean>;
}

export interface ContractTermination {
  terminatedAt: Date | null;
  mode: ContractTerminationMode | null;
  accessEndsAt: Date | null;
}

export interface ContractDetail {
  id: string;
  contractName: string | null;
  status: ContractStatus;
  plan: ContractPlanSummary;
  tenantId: string | null;
  agreedPrice: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentFrequency: PaymentFrequency;
  discountPercent: number | null;
  gracePeriodDays: number | null;
  autoRenew: boolean;
  notes: string | null;
  contractStartAt: Date;
  contractEndAt: Date | null;
  createdByAdmin: ContractAdminSummary;
  /** Frozen at activation (a preview while DRAFT); null on legacy contracts. */
  planSnapshot: PlanSnapshot | null;
  livePlan: ContractLivePlan;
  termination: ContractTermination | null;
  createdAt: Date;
  updatedAt: Date;
}
