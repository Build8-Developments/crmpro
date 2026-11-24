import { Prisma } from '@crmpro/database';
import type {
  TenantContractSummary,
  TenantDetail,
  TenantListItem,
  TenantOwnerSummary,
} from '../types/tenant.types';

type TenantWithPlan = {
  id: string;
  name: string;
  slug: string;
  status: TenantListItem['status'];
  createdAt: Date;
  subscriptionPlan: { id: string; name: string };
};

type TenantWithRelations = TenantWithPlan & {
  contracts: Array<{
    id: string;
    contractName: string | null;
    status: string;
    agreedPrice: Prisma.Decimal;
    currency: string;
    deletedAt: Date | null;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    deletedAt: Date | null;
    role: { name: string };
  }>;
};

/** WORKSPACE_URL_TEMPLATE (e.g. https://{slug}.nomow.app) filled in for one tenant. */
export function workspaceUrlFor(
  slug: string,
  template: string | null | undefined,
): string | null {
  return template ? template.replace('{slug}', slug).replace(/\/$/, '') : null;
}

export function toTenantListItem(
  tenant: TenantWithPlan,
  workspaceUrlTemplate?: string | null,
): TenantListItem {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    workspaceUrl: workspaceUrlFor(tenant.slug, workspaceUrlTemplate),
    status: tenant.status,
    plan: {
      id: tenant.subscriptionPlan.id,
      name: tenant.subscriptionPlan.name,
    },
    createdAt: tenant.createdAt,
  };
}

function toContractSummary(
  contract: TenantWithRelations['contracts'][number],
): TenantContractSummary {
  return {
    id: contract.id,
    contractName: contract.contractName,
    status: contract.status,
    agreedPrice: contract.agreedPrice.toNumber(),
    currency: contract.currency,
  };
}

function findOwnerUser(
  users: TenantWithRelations['users'],
): TenantOwnerSummary | null {
  const owner = users.find(
    (user) => user.deletedAt === null && user.role.name === 'Owner',
  );

  if (!owner) {
    return null;
  }

  return {
    id: owner.id,
    fullName: owner.name,
    email: owner.email,
  };
}

export function toTenantDetail(
  tenant: TenantWithRelations,
  workspaceUrlTemplate?: string | null,
): TenantDetail {
  const activeContract =
    tenant.contracts.find((contract) => contract.deletedAt === null) ?? null;

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    workspaceUrl: workspaceUrlFor(tenant.slug, workspaceUrlTemplate),
    status: tenant.status,
    subscriptionPlan: {
      id: tenant.subscriptionPlan.id,
      name: tenant.subscriptionPlan.name,
    },
    contract: activeContract ? toContractSummary(activeContract) : null,
    ownerUser: findOwnerUser(tenant.users),
    createdAt: tenant.createdAt,
  };
}
