import { Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus } from '@crmpro/database';
import { parsePlanSnapshot } from '@crmpro/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface UsageMetric {
  used: number;
  limit: number | null;
}

/**
 * Read-only plan, contract and usage overview for the workspace owner.
 * Payments are handled offline by the platform team (no gateway in MVP).
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        name: true,
        status: true,
        storageUsedBytes: true,
        subscriptionPlan: {
          select: {
            name: true,
            defaultPrice: true,
            currency: true,
            maxUsers: true,
            maxLeads: true,
            maxProjects: true,
            maxStorageBytes: true,
            featureFlags: true,
          },
        },
        contracts: {
          where: {
            deletedAt: null,
            status: {
              in: [
                ContractStatus.ACTIVE,
                ContractStatus.EXPIRED,
                ContractStatus.TERMINATED,
              ],
            },
          },
          orderBy: [{ status: 'asc' }, { contractStartAt: 'desc' }],
          take: 1,
          select: {
            contractName: true,
            status: true,
            agreedPrice: true,
            currency: true,
            paymentMethod: true,
            paymentFrequency: true,
            contractStartAt: true,
            contractEndAt: true,
            gracePeriodDays: true,
            autoRenew: true,
            planSnapshot: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Workspace not found');
    }

    const contract =
      tenant.contracts.find((item) => item.status === ContractStatus.ACTIVE) ??
      tenant.contracts[0] ??
      null;
    const snapshot = contract ? parsePlanSnapshot(contract.planSnapshot) : null;
    const plan = tenant.subscriptionPlan;
    const limits = snapshot
      ? {
          maxUsers: snapshot.quotas.maxUsers,
          maxLeads: snapshot.quotas.maxLeads,
          maxProjects: snapshot.quotas.maxProjects,
          maxStorageBytes: snapshot.quotas.maxStorageBytes,
        }
      : {
          maxUsers: plan.maxUsers,
          maxLeads: plan.maxLeads,
          maxProjects: plan.maxProjects,
          maxStorageBytes: plan.maxStorageBytes?.toString() ?? null,
        };
    const features = snapshot?.featureFlags ?? this.asFlags(plan.featureFlags);

    const [users, leads, projects] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, deletedAt: null, isActive: true },
      }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.project.count({ where: { tenantId, deletedAt: null } }),
    ]);

    return {
      workspace: { name: tenant.name, status: tenant.status },
      plan: {
        name: snapshot?.name ?? plan.name,
        price:
          snapshot?.price ??
          (plan.defaultPrice ? Number(plan.defaultPrice) : null),
        currency: snapshot?.currency ?? plan.currency,
        features,
      },
      contract: contract
        ? {
            name: contract.contractName,
            status: contract.status,
            agreedPrice: Number(contract.agreedPrice),
            currency: contract.currency,
            paymentMethod: contract.paymentMethod,
            paymentFrequency: contract.paymentFrequency,
            startsAt: contract.contractStartAt.toISOString(),
            endsAt: contract.contractEndAt?.toISOString() ?? null,
            gracePeriodDays: contract.gracePeriodDays,
            autoRenew: contract.autoRenew,
          }
        : null,
      usage: {
        users: { used: users, limit: limits.maxUsers } satisfies UsageMetric,
        leads: { used: leads, limit: limits.maxLeads } satisfies UsageMetric,
        projects: {
          used: projects,
          limit: limits.maxProjects,
        } satisfies UsageMetric,
        storageBytes: {
          used: tenant.storageUsedBytes.toString(),
          limit: limits.maxStorageBytes,
        },
      },
    };
  }

  private asFlags(value: unknown): Record<string, boolean> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, flag]) => [
        key,
        flag === true,
      ]),
    );
  }
}
