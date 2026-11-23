import { Injectable } from '@nestjs/common';
import { DealStatus } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OPEN_LEAD_WHERE } from '../leads/utils/lead-filter-where.util';

/**
 * Who is "selling" a project: the owner of an open lead interested in it, or
 * the agent of a live (not cancelled) deal on it — the deal's credited agent,
 * else the lead owner. One definition for both directions: who hears about a
 * project update, and whose Today shows it.
 */
@Injectable()
export class ProjectSellersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active users of the tenant selling the project who can read projects
   * (the notification links to the project), the author excluded.
   */
  async findSellerIds(params: {
    tenantId: string;
    projectId: string;
    excludeUserId?: string | null;
    limit: number;
  }): Promise<string[]> {
    const { tenantId, projectId } = params;

    const [leads, deals] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...OPEN_LEAD_WHERE,
          assignedUserId: { not: null },
          leadProjectInterests: { some: { projectId } },
        },
        select: { assignedUserId: true },
        distinct: ['assignedUserId'],
      }),
      this.prisma.deal.findMany({
        where: {
          tenantId,
          projectId,
          status: { not: DealStatus.CANCELLED },
          lead: { deletedAt: null },
        },
        select: { agentId: true, lead: { select: { assignedUserId: true } } },
      }),
    ]);

    const candidateIds = new Set<string>();
    for (const lead of leads) {
      if (lead.assignedUserId) candidateIds.add(lead.assignedUserId);
    }
    for (const deal of deals) {
      const agentId = deal.agentId ?? deal.lead.assignedUserId;
      if (agentId) candidateIds.add(agentId);
    }
    if (params.excludeUserId) candidateIds.delete(params.excludeUserId);
    if (candidateIds.size === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: [...candidateIds] },
        isActive: true,
        deletedAt: null,
        role: {
          permissions: {
            some: { permission: { key: PERMISSIONS.PROJECT_READ } },
          },
        },
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: params.limit,
    });

    return users.map((user) => user.id);
  }

  /** Live projects of the tenant the user is selling. */
  async findProjectIdsSoldBy(
    tenantId: string,
    userId: string,
  ): Promise<string[]> {
    const [interests, deals] = await Promise.all([
      this.prisma.leadProjectInterest.findMany({
        where: {
          project: { tenantId, deletedAt: null },
          lead: {
            tenantId,
            deletedAt: null,
            ...OPEN_LEAD_WHERE,
            assignedUserId: userId,
          },
        },
        select: { projectId: true },
        distinct: ['projectId'],
      }),
      this.prisma.deal.findMany({
        where: {
          tenantId,
          status: { not: DealStatus.CANCELLED },
          project: { deletedAt: null },
          lead: { deletedAt: null },
          OR: [
            { agentId: userId },
            { agentId: null, lead: { assignedUserId: userId } },
          ],
        },
        select: { projectId: true },
        distinct: ['projectId'],
      }),
    ]);

    const projectIds = new Set<string>();
    for (const row of interests) projectIds.add(row.projectId);
    for (const row of deals) {
      if (row.projectId) projectIds.add(row.projectId);
    }
    return [...projectIds];
  }
}
