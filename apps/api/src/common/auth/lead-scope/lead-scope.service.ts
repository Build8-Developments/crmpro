import { Injectable } from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PrismaService } from '../../prisma/prisma.service';
import type { LeadScope } from './lead-scope.types';

@Injectable()
export class LeadScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The actor's lead scope from their permission keys. Team scope covers the
   * team the actor belongs to and every team they lead, always including the
   * actor themself.
   */
  async resolve(
    user: { id: string; tenantId: string },
    permissionKeys: ReadonlySet<string>,
  ): Promise<LeadScope> {
    if (permissionKeys.has(PERMISSIONS.LEAD_READ_ALL)) {
      return { kind: 'all', actorUserId: user.id };
    }

    if (permissionKeys.has(PERMISSIONS.LEAD_READ_TEAM)) {
      return {
        kind: 'team',
        actorUserId: user.id,
        userIds: await this.resolveTeamUserIds(user.tenantId, user.id),
      };
    }

    return { kind: 'own', actorUserId: user.id };
  }

  async resolveTeamUserIds(
    tenantId: string,
    userId: string,
  ): Promise<string[]> {
    const actor = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { teamId: true },
    });

    const teams = await this.prisma.team.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { leaderUserId: userId },
          ...(actor?.teamId ? [{ id: actor.teamId }] : []),
        ],
      },
      select: { id: true },
    });

    if (teams.length === 0) return [userId];

    const members = await this.prisma.user.findMany({
      where: {
        tenantId,
        deletedAt: null,
        teamId: { in: teams.map((team) => team.id) },
      },
      select: { id: true },
    });

    return [...new Set([userId, ...members.map((member) => member.id)])];
  }
}
