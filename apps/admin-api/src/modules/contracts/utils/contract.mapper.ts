import { Logger } from '@nestjs/common';
import { ContractTerminationMode, Prisma } from '@crmpro/database';
import {
  parseFeatureFlagRecord,
  parsePlanSnapshot,
} from '@crmpro/shared/billing';
import type {
  ContractDetail,
  ContractListItem,
  ContractLivePlan,
} from '../types/contract.types';

const logger = new Logger('ContractMapper');

type ContractPlanRecord = {
  id: string;
  name: string;
  isActive: boolean;
  maxUsers: number | null;
  maxLeads: number | null;
  maxProjects: number | null;
  maxStorageBytes: bigint | null;
  featureFlags: Prisma.JsonValue;
};

type ContractWithPlan = {
  id: string;
  contractName: string | null;
  status: ContractListItem['status'];
  tenantId: string | null;
  agreedPrice: Prisma.Decimal;
  currency: string;
  paymentMethod: ContractListItem['paymentMethod'];
  paymentFrequency: ContractListItem['paymentFrequency'];
  contractStartAt: Date;
  contractEndAt: Date | null;
  gracePeriodDays: number | null;
  autoRenew: boolean;
  plan: ContractPlanRecord;
};

type ContractWithRelations = ContractWithPlan & {
  discountPercent: number | null;
  notes: string | null;
  planSnapshot: Prisma.JsonValue | null;
  terminatedAt: Date | null;
  terminationMode: ContractTerminationMode | null;
  accessEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdByAdmin: { id: string; fullName: string; email: string };
};

function toPrice(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toLivePlan(plan: ContractPlanRecord): ContractLivePlan {
  return {
    id: plan.id,
    name: plan.name,
    isActive: plan.isActive,
    quotas: {
      maxUsers: plan.maxUsers,
      maxLeads: plan.maxLeads,
      maxProjects: plan.maxProjects,
      maxStorageBytes:
        plan.maxStorageBytes === null ? null : plan.maxStorageBytes.toString(),
    },
    featureFlags: parseFeatureFlagRecord(plan.featureFlags),
  };
}

export function toContractListItem(
  contract: ContractWithPlan,
): ContractListItem {
  return {
    id: contract.id,
    contractName: contract.contractName,
    status: contract.status,
    tenantId: contract.tenantId,
    planName: contract.plan.name,
    agreedPrice: toPrice(contract.agreedPrice),
    currency: contract.currency,
    paymentMethod: contract.paymentMethod,
    paymentFrequency: contract.paymentFrequency,
    contractStartAt: contract.contractStartAt,
    contractEndAt: contract.contractEndAt,
    gracePeriodDays: contract.gracePeriodDays,
    autoRenew: contract.autoRenew,
  };
}

export function toContractDetail(
  contract: ContractWithRelations,
): ContractDetail {
  return {
    id: contract.id,
    contractName: contract.contractName,
    status: contract.status,
    plan: {
      id: contract.plan.id,
      name: contract.plan.name,
      isActive: contract.plan.isActive,
    },
    tenantId: contract.tenantId,
    agreedPrice: toPrice(contract.agreedPrice),
    currency: contract.currency,
    paymentMethod: contract.paymentMethod,
    paymentFrequency: contract.paymentFrequency,
    discountPercent: contract.discountPercent,
    gracePeriodDays: contract.gracePeriodDays,
    autoRenew: contract.autoRenew,
    notes: contract.notes,
    contractStartAt: contract.contractStartAt,
    contractEndAt: contract.contractEndAt,
    createdByAdmin: {
      id: contract.createdByAdmin.id,
      fullName: contract.createdByAdmin.fullName,
      email: contract.createdByAdmin.email,
    },
    planSnapshot: parsePlanSnapshot(contract.planSnapshot, (issue) =>
      logger.warn(`Contract ${contract.id} plan snapshot: ${issue}`),
    ),
    livePlan: toLivePlan(contract.plan),
    termination:
      contract.terminatedAt || contract.terminationMode
        ? {
            terminatedAt: contract.terminatedAt,
            mode: contract.terminationMode,
            accessEndsAt: contract.accessEndsAt,
          }
        : null,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}
