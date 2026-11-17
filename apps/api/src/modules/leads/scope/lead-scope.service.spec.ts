import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import { LeadScopeService } from './lead-scope.service';

describe('LeadScopeService', () => {
  const user = { id: 'manager-1', tenantId: 'tenant-1' };
  let prisma: {
    user: { findFirst: jest.Mock; findMany: jest.Mock };
    team: { findMany: jest.Mock };
  };
  let service: LeadScopeService;

  beforeEach(() => {
    prisma = {
      user: { findFirst: jest.fn(), findMany: jest.fn() },
      team: { findMany: jest.fn() },
    };
    service = new LeadScopeService(prisma as never);
  });

  const keys = (...values: PermissionKey[]) => new Set(values);

  it('grants tenant-wide scope with lead.read-all', async () => {
    await expect(
      service.resolve(
        user,
        keys(PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_READ_ALL),
      ),
    ).resolves.toEqual({ kind: 'all', actorUserId: 'manager-1' });
    expect(prisma.team.findMany).not.toHaveBeenCalled();
  });

  it('defaults to own scope without a scope permission', async () => {
    await expect(
      service.resolve(user, keys(PERMISSIONS.LEAD_READ)),
    ).resolves.toEqual({ kind: 'own', actorUserId: 'manager-1' });
  });

  it('resolves team scope from led and joined teams, tenant-scoped', async () => {
    prisma.user.findFirst.mockResolvedValue({ teamId: 'team-a' });
    prisma.team.findMany.mockResolvedValue([
      { id: 'team-a' },
      { id: 'team-b' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'agent-1' },
      { id: 'agent-2' },
      { id: 'manager-1' },
    ]);

    const scope = await service.resolve(
      user,
      keys(PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_READ_TEAM),
    );

    expect(scope).toEqual({
      kind: 'team',
      actorUserId: 'manager-1',
      userIds: ['manager-1', 'agent-1', 'agent-2'],
    });
    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          deletedAt: null,
          OR: [{ leaderUserId: 'manager-1' }, { id: 'team-a' }],
        }) as Record<string, unknown>,
      }),
    );
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          teamId: { in: ['team-a', 'team-b'] },
        }) as Record<string, unknown>,
      }),
    );
  });

  it('falls back to just the actor when they have no team', async () => {
    prisma.user.findFirst.mockResolvedValue({ teamId: null });
    prisma.team.findMany.mockResolvedValue([]);

    await expect(
      service.resolve(user, keys(PERMISSIONS.LEAD_READ_TEAM)),
    ).resolves.toEqual({
      kind: 'team',
      actorUserId: 'manager-1',
      userIds: ['manager-1'],
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
