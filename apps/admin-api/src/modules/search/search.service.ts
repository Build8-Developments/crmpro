import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { GlobalSearchResult, SearchHit } from './search.types';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit = 8): Promise<GlobalSearchResult> {
    const take = Math.min(Math.max(limit, 1), 20);

    const [tenants, plans, contracts, admins] = await Promise.all([
      this.prisma.tenant.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { slug: { contains: query, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      }),
      this.prisma.subscriptionPlan.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          currency: true,
        },
      }),
      this.prisma.tenantContract.findMany({
        where: {
          deletedAt: null,
          OR: [
            { contractName: { contains: query, mode: 'insensitive' } },
            { notes: { contains: query, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          contractName: true,
          status: true,
          plan: { select: { name: true } },
        },
      }),
      this.prisma.platformAdmin.findMany({
        where: {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          role: { select: { name: true } },
        },
      }),
    ]);

    return {
      query,
      tenants: tenants.map(
        (tenant): SearchHit => ({
          id: tenant.id,
          type: 'tenant',
          title: tenant.name,
          subtitle: tenant.slug,
          href: `/tenants/${tenant.id}`,
          status: tenant.status,
        }),
      ),
      plans: plans.map(
        (plan): SearchHit => ({
          id: plan.id,
          type: 'plan',
          title: plan.name,
          subtitle: plan.currency ?? 'No currency',
          href: `/plans/${plan.id}`,
          status: plan.isActive ? 'ACTIVE' : 'ARCHIVED',
        }),
      ),
      contracts: contracts.map(
        (contract): SearchHit => ({
          id: contract.id,
          type: 'contract',
          title: contract.contractName?.trim() || 'Untitled contract',
          subtitle: contract.plan.name,
          href: `/contracts/${contract.id}`,
          status: contract.status,
        }),
      ),
      admins: admins.map(
        (admin): SearchHit => ({
          id: admin.id,
          type: 'admin',
          title: admin.fullName,
          subtitle: `${admin.email} · ${admin.role.name}`,
          href: `/admins/${admin.id}`,
          status: admin.isActive ? 'ACTIVE' : 'INACTIVE',
        }),
      ),
    };
  }
}
