import { Injectable } from '@nestjs/common';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import type { LeadScope } from './lead-scope.types';

@Injectable()
export class LeadScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the actor's lead scope from their (already loaded) permission keys.
   * Team scope = members of the team the actor belongs to plus every team the
   * actor leads, always including the actor.
   */
  async resolve(
    user: Pick<AuthenticatedUser, 'id' | 'tenantId'>,
    permissionKeys: ReadonlySet<PermissionKey>,
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

    if (teams.length === 0) {
      return [userId];
    }

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
