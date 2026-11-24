import { BadRequestException, ConflictException } from '@nestjs/common';
import { UserInvitationsService } from './user-invitations.service';

describe('UserInvitationsService', () => {
  let tx: { user: { create: jest.Mock } };
  let prisma: {
    user: { findFirst: jest.Mock; findFirstOrThrow: jest.Mock };
    team: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let quota: { assertCanCreateUserInTransaction: jest.Mock };
  let guard: { assertActorCanAssignRole: jest.Mock };
  let tokens: { issue: jest.Mock };
  let mail: { send: jest.Mock; workspaceUrl: jest.Mock };
  let service: UserInvitationsService;

  const createdUser = {
    id: 'user-9',
    name: 'Omar',
    email: 'omar@agency.com',
    phone: null,
    isActive: true,
    lastLoginAt: null,
    invitedAt: new Date(),
    inviteAcceptedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { id: 'role-agent', name: 'Agent' },
    team: null,
  };

  beforeEach(() => {
    tx = { user: { create: jest.fn().mockResolvedValue(createdUser) } };
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          name: 'Omar',
          email: 'omar@agency.com',
          tenant: { name: 'Prime Estates', slug: 'prime' },
        }),
      },
      team: { findFirst: jest.fn() },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    quota = { assertCanCreateUserInTransaction: jest.fn() };
    guard = { assertActorCanAssignRole: jest.fn() };
    tokens = { issue: jest.fn().mockResolvedValue('invite-token') };
    mail = {
      send: jest.fn(),
      workspaceUrl: jest.fn(
        (slug: string, path: string) => `https://${slug}.app.test${path}`,
      ),
    };
    service = new UserInvitationsService(
      prisma as never,
      { hash: jest.fn().mockResolvedValue('unusable') } as never,
      quota as never,
      guard as never,
      tokens as never,
      mail as never,
      { createAuditLog: jest.fn() } as never,
    );
  });

  it('creates a pending user within quota and emails the invitation', async () => {
    const result = await service.inviteUser('tenant-1', 'owner-1', {
      fullName: 'Omar',
      email: 'omar@agency.com',
      roleId: 'role-agent',
    });

    expect(guard.assertActorCanAssignRole).toHaveBeenCalledWith(
      'tenant-1',
      'owner-1',
      'role-agent',
    );
    expect(quota.assertCanCreateUserInTransaction).toHaveBeenCalled();
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'unusable',
          invitedAt: expect.any(Date) as Date,
        }) as Record<string, unknown>,
      }),
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'omar@agency.com',
        text: expect.stringContaining(
          '/accept-invite?token=invite-token',
        ) as string,
      }),
    );
    expect(result.invitationPending).toBe(true);
  });

  it('refuses duplicate emails in the tenant', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      service.inviteUser('tenant-1', 'owner-1', {
        fullName: 'Omar',
        email: 'omar@agency.com',
        roleId: 'role-agent',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('only resends invitations that are still pending', async () => {
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 'user-9',
      invitedAt: new Date(),
      inviteAcceptedAt: new Date(),
    });

    await expect(
      service.resendInvite('tenant-1', 'owner-1', 'user-9'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
