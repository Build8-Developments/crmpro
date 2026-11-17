import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TEAM_AUDIT_ACTIONS } from '../audit/audit.constants';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  const team = {
    id: 'team-1',
    name: 'Sales A',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    leader: { id: 'manager-1', name: 'Manager' },
    members: [
      {
        id: 'agent-1',
        name: 'Agent One',
        email: 'a1@x.com',
        isActive: true,
        role: { id: 'r', name: 'Agent' },
      },
    ],
  };

  let tx: { team: Record<string, jest.Mock>; user: { updateMany: jest.Mock } };
  let prisma: {
    team: { findFirst: jest.Mock; findMany: jest.Mock };
    user: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { createAuditLog: jest.Mock };
  let service: TeamsService;

  beforeEach(() => {
    tx = {
      team: {
        create: jest.fn().mockResolvedValue({ id: 'team-1' }),
        update: jest.fn(),
      },
      user: { updateMany: jest.fn() },
    };
    prisma = {
      team: { findFirst: jest.fn(), findMany: jest.fn() },
      user: { count: jest.fn() },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    audit = { createAuditLog: jest.fn() };
    service = new TeamsService(prisma as never, audit as never);
  });

  it('rejects duplicate team names inside the tenant', async () => {
    prisma.team.findFirst.mockResolvedValue({ id: 'other' });

    await expect(
      service.createTeam('tenant-1', 'owner-1', { name: 'Sales A' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects members that are not in the tenant', async () => {
    prisma.team.findFirst.mockResolvedValue(null);
    prisma.user.count.mockResolvedValue(1);

    await expect(
      service.createTeam('tenant-1', 'owner-1', {
        name: 'Sales B',
        memberIds: ['agent-1', 'foreign-user'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        id: { in: ['agent-1', 'foreign-user'] },
        deletedAt: null,
      },
    });
  });

  it('replaces membership inside one audited transaction', async () => {
    prisma.team.findFirst.mockResolvedValue(team);
    prisma.user.count.mockResolvedValue(2);

    await service.setMembers('team-1', 'tenant-1', 'owner-1', {
      userIds: ['agent-2', 'agent-3'],
    });

    expect(tx.user.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        tenantId: 'tenant-1',
        teamId: 'team-1',
        id: { notIn: ['agent-2', 'agent-3'] },
      },
      data: { teamId: null },
    });
    expect(tx.user.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        tenantId: 'tenant-1',
        id: { in: ['agent-2', 'agent-3'] },
        deletedAt: null,
      },
      data: { teamId: 'team-1' },
    });
    expect(audit.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: TEAM_AUDIT_ACTIONS.MEMBERS_UPDATED,
        metadata: { added: ['agent-2', 'agent-3'], removed: ['agent-1'] },
        tx,
      }),
    );
  });

  it('frees members and the name slot when a team is deleted', async () => {
    prisma.team.findFirst.mockResolvedValue(team);

    await service.deleteTeam('team-1', 'tenant-1', 'owner-1');

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', teamId: 'team-1' },
      data: { teamId: null },
    });
    expect(tx.team.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leaderUserId: null,
          deletedAt: expect.any(Date) as Date,
        }) as Record<string, unknown>,
      }),
    );
  });

  it('never resolves a team from another tenant', async () => {
    prisma.team.findFirst.mockResolvedValue(null);

    await expect(service.getTeam('team-1', 'tenant-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team-1', tenantId: 'tenant-2', deletedAt: null },
      }),
    );
  });
});
