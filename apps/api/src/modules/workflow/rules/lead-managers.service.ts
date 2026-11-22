import { Injectable } from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * Who should hear about a problem with a lead: people who can (re)assign it
 * (lead.assign) and can see it — organization-wide managers, or the leader of
 * the assignee's team when their role is team-scoped.
 */
@Injectable()
export class LeadManagersService {
  constructor(private readonly prisma: PrismaService) {}

  async forAssignee(
    tenantId: string,
    assigneeId: string | null,
  ): Promise<string[]> {
    const managers = await this.managersOf(tenantId, assigneeId);
    return managers.map((manager) => manager.id);
  }

  /**
   * The one manager who owns a review of this person's lead (R9, R12): the
   * leader of their team first, else the longest-standing organization-wide
   * manager. Null when nobody qualifies.
   */
  async reviewerFor(
    tenantId: string,
    assigneeId: string | null,
  ): Promise<string | null> {
    const managers = await this.managersOf(tenantId, assigneeId);
    const teamLeader = managers.find((manager) => manager.leadsAssigneeTeam);
    return (teamLeader ?? managers[0])?.id ?? null;
  }

  private async managersOf(
    tenantId: string,
    assigneeId: string | null,
  ): Promise<Array<{ id: string; leadsAssigneeTeam: boolean }>> {
    const [candidates, assignee] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          role: {
            permissions: {
              some: { permission: { key: PERMISSIONS.LEAD_ASSIGN } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          ledTeams: { where: { deletedAt: null }, select: { id: true } },
          role: {
            select: {
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      }),
      assigneeId
        ? this.prisma.user.findFirst({
            where: { id: assigneeId, tenantId },
            select: { teamId: true },
          })
        : null,
    ]);

    return candidates
      .filter((user) => user.id !== assigneeId)
      .map((user) => {
        const keys = new Set(
          user.role.permissions.map((p) => p.permission.key),
        );
        const leadsAssigneeTeam = Boolean(
          assignee?.teamId &&
          user.ledTeams.some((team) => team.id === assignee.teamId),
        );
        const sees =
          keys.has(PERMISSIONS.LEAD_READ_ALL) ||
          (keys.has(PERMISSIONS.LEAD_READ_TEAM) && leadsAssigneeTeam);
        return { id: user.id, leadsAssigneeTeam, sees };
      })
      .filter((user) => user.sees)
      .map(({ id, leadsAssigneeTeam }) => ({ id, leadsAssigneeTeam }));
  }

  /** Organization-wide distributors: they own the unassigned pool (R13). */
  async distributors(tenantId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        AND: [
          {
            role: {
              permissions: {
                some: { permission: { key: PERMISSIONS.LEAD_ASSIGN } },
              },
            },
          },
          {
            role: {
              permissions: {
                some: { permission: { key: PERMISSIONS.LEAD_READ_ALL } },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }
}
