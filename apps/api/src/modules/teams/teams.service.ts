import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import {
  AUDIT_ENTITY_TYPES,
  TEAM_AUDIT_ACTIONS,
} from '../audit/audit.constants';
import { CreateTeamDto } from './dto/create-team.dto';
import { SetTeamMembersDto } from './dto/set-team-members.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import type { TeamResponse } from './teams.types';

const teamSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  leader: { select: { id: true, name: true } },
  members: {
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.TeamSelect;

type TeamRecord = Prisma.TeamGetPayload<{ select: typeof teamSelect }>;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async listTeams(tenantId: string): Promise<{ items: TeamResponse[] }> {
    const teams = await this.prisma.team.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: teamSelect,
    });

    return { items: teams.map((team) => this.toResponse(team)) };
  }

  async getTeam(id: string, tenantId: string): Promise<TeamResponse> {
    return this.toResponse(await this.getTeamOrThrow(id, tenantId));
  }

  async createTeam(
    tenantId: string,
    actorUserId: string,
    dto: CreateTeamDto,
  ): Promise<TeamResponse> {
    await this.assertNameAvailable(tenantId, dto.name);

    if (dto.leaderUserId) {
      await this.assertUsersInTenant(tenantId, [dto.leaderUserId]);
    }

    const memberIds = this.dedupe(dto.memberIds ?? []);
    await this.assertUsersInTenant(tenantId, memberIds);

    const teamId = await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          tenantId,
          name: dto.name,
          leaderUserId: dto.leaderUserId ?? null,
        },
        select: { id: true },
      });

      if (memberIds.length > 0) {
        await tx.user.updateMany({
          where: { tenantId, id: { in: memberIds }, deletedAt: null },
          data: { teamId: team.id },
        });
      }

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: TEAM_AUDIT_ACTIONS.CREATED,
        entityType: AUDIT_ENTITY_TYPES.TEAM,
        entityId: team.id,
        metadata: {
          name: dto.name,
          leaderUserId: dto.leaderUserId ?? null,
          memberCount: memberIds.length,
        },
        tx,
      });

      return team.id;
    });

    return this.getTeam(teamId, tenantId);
  }

  async updateTeam(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: UpdateTeamDto,
  ): Promise<TeamResponse> {
    const existing = await this.getTeamOrThrow(id, tenantId);

    if (dto.name !== undefined && dto.name !== existing.name) {
      await this.assertNameAvailable(tenantId, dto.name, existing.id);
    }

    if (dto.leaderUserId) {
      await this.assertUsersInTenant(tenantId, [dto.leaderUserId]);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: existing.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.leaderUserId !== undefined
            ? { leaderUserId: dto.leaderUserId }
            : {}),
        },
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: TEAM_AUDIT_ACTIONS.UPDATED,
        entityType: AUDIT_ENTITY_TYPES.TEAM,
        entityId: existing.id,
        metadata: {
          ...(dto.name !== undefined
            ? { previousName: existing.name, name: dto.name }
            : {}),
          ...(dto.leaderUserId !== undefined
            ? {
                previousLeaderUserId: existing.leader?.id ?? null,
                leaderUserId: dto.leaderUserId,
              }
            : {}),
        },
        tx,
      });
    });

    return this.getTeam(existing.id, tenantId);
  }

  /**
   * Replaces the team's membership. Users can only be in one team, so adding
   * someone here moves them out of their previous team.
   */
  async setMembers(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: SetTeamMembersDto,
  ): Promise<TeamResponse> {
    const existing = await this.getTeamOrThrow(id, tenantId);
    const userIds = this.dedupe(dto.userIds);
    await this.assertUsersInTenant(tenantId, userIds);

    const previousIds = existing.members.map((member) => member.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: {
          tenantId,
          teamId: existing.id,
          id: { notIn: userIds },
        },
        data: { teamId: null },
      });

      if (userIds.length > 0) {
        await tx.user.updateMany({
          where: { tenantId, id: { in: userIds }, deletedAt: null },
          data: { teamId: existing.id },
        });
      }

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: TEAM_AUDIT_ACTIONS.MEMBERS_UPDATED,
        entityType: AUDIT_ENTITY_TYPES.TEAM,
        entityId: existing.id,
        metadata: {
          added: userIds.filter((userId) => !previousIds.includes(userId)),
          removed: previousIds.filter((userId) => !userIds.includes(userId)),
        },
        tx,
      });
    });

    return this.getTeam(existing.id, tenantId);
  }

  async deleteTeam(
    id: string,
    tenantId: string,
    actorUserId: string,
  ): Promise<{ id: string }> {
    const existing = await this.getTeamOrThrow(id, tenantId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { tenantId, teamId: existing.id },
        data: { teamId: null },
      });

      // Free the unique (tenantId, name) slot so the name can be reused.
      await tx.team.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          leaderUserId: null,
          name: `${existing.name} (deleted ${existing.id.slice(0, 8)})`,
        },
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: TEAM_AUDIT_ACTIONS.DELETED,
        entityType: AUDIT_ENTITY_TYPES.TEAM,
        entityId: existing.id,
        metadata: {
          name: existing.name,
          memberCount: existing.members.length,
        },
        tx,
      });
    });

    return { id: existing.id };
  }

  private async getTeamOrThrow(
    id: string,
    tenantId: string,
  ): Promise<TeamRecord> {
    const team = await this.prisma.team.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: teamSelect,
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  private async assertNameAvailable(
    tenantId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.team.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (conflict) {
      throw new BadRequestException('A team with this name already exists');
    }
  }

  private async assertUsersInTenant(
    tenantId: string,
    userIds: string[],
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const count = await this.prisma.user.count({
      where: { tenantId, id: { in: userIds }, deletedAt: null },
    });

    if (count !== userIds.length) {
      throw new BadRequestException('One or more users not found');
    }
  }

  private dedupe(ids: string[]): string[] {
    return [...new Set(ids)];
  }

  private toResponse(team: TeamRecord): TeamResponse {
    return {
      id: team.id,
      name: team.name,
      leader: team.leader,
      memberCount: team.members.length,
      members: team.members,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }
}
