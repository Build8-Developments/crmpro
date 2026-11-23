import { PERMISSIONS } from '@crmpro/shared/auth';
import { LeadScopeService } from './lead-scope.service';

describe('LeadScopeService.resolve', () => {
  const user = { id: 'user-1', tenantId: 'tenant-1' };
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

  it('gives lead.read-all the whole organization', async () => {
    const scope = await service.resolve(
      user,
      new Set([PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_READ_ALL]),
    );
    expect(scope).toEqual({ kind: 'all', actorUserId: 'user-1' });
    expect(prisma.team.findMany).not.toHaveBeenCalled();
  });

  it('gives no scope key "own"', async () => {
    const scope = await service.resolve(user, new Set([PERMISSIONS.LEAD_READ]));
    expect(scope).toEqual({ kind: 'own', actorUserId: 'user-1' });
  });

  it('gives lead.read-team the members of led and joined teams', async () => {
    prisma.user.findFirst.mockResolvedValue({ teamId: 'team-a' });
    prisma.team.findMany.mockResolvedValue([
      { id: 'team-a' },
      { id: 'team-b' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'agent-1' },
      { id: 'agent-2' },
      { id: 'user-1' },
    ]);

    const scope = await service.resolve(
      user,
      new Set([PERMISSIONS.LEAD_READ, PERMISSIONS.LEAD_READ_TEAM]),
    );

    expect(scope).toEqual({
      kind: 'team',
      actorUserId: 'user-1',
      userIds: ['user-1', 'agent-1', 'agent-2'],
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          teamId: { in: ['team-a', 'team-b'] },
        }),
      }),
    );
  });

  it('falls back to just the actor when they lead or belong to no team', async () => {
    prisma.user.findFirst.mockResolvedValue({ teamId: null });
    prisma.team.findMany.mockResolvedValue([]);

    const scope = await service.resolve(
      user,
      new Set([PERMISSIONS.LEAD_READ_TEAM]),
    );

    expect(scope).toEqual({
      kind: 'team',
      actorUserId: 'user-1',
      userIds: ['user-1'],
    });
  });
});
