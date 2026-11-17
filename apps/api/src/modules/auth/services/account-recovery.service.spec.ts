import { BadRequestException } from '@nestjs/common';
import { UserTokenType } from '@crmpro/database';
import { AccountRecoveryService } from './account-recovery.service';

describe('AccountRecoveryService', () => {
  const activeUser = {
    id: 'user-1',
    name: 'Mona',
    email: 'mona@agency.com',
    tenantId: 'tenant-1',
    invitedAt: null,
    inviteAcceptedAt: null,
    tenant: { name: 'Prime Estates' },
  };

  let tx: {
    user: { update: jest.Mock };
    userSession: { updateMany: jest.Mock };
  };
  let prisma: { user: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let tokens: {
    issue: jest.Mock;
    issuedWithin: jest.Mock;
    consume: jest.Mock;
    peek: jest.Mock;
  };
  let mail: { send: jest.Mock; webUrl: jest.Mock };
  let tenantAccess: { assertTenantAccessible: jest.Mock };
  let audit: { createAuditLog: jest.Mock };
  let service: AccountRecoveryService;

  beforeEach(() => {
    tx = {
      user: {
        update: jest.fn().mockResolvedValue({
          email: 'mona@agency.com',
          tenant: { slug: 'prime' },
        }),
      },
      userSession: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
    };
    prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(activeUser) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    tokens = {
      issue: jest.fn().mockResolvedValue('raw-token'),
      issuedWithin: jest.fn().mockResolvedValue(false),
      consume: jest
        .fn()
        .mockResolvedValue({ id: 't', tenantId: 'tenant-1', userId: 'user-1' }),
      peek: jest.fn(),
    };
    mail = {
      send: jest.fn(),
      webUrl: jest.fn((path: string) => `https://app.test${path}`),
    };
    tenantAccess = { assertTenantAccessible: jest.fn() };
    audit = { createAuditLog: jest.fn() };
    service = new AccountRecoveryService(
      prisma as never,
      { hash: jest.fn().mockResolvedValue('hashed') } as never,
      tokens as never,
      mail as never,
      tenantAccess as never,
      audit as never,
    );
  });

  it('emails a single-use reset link to an active account', async () => {
    await service.requestPasswordReset('prime', 'mona@agency.com');

    expect(tokens.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: UserTokenType.PASSWORD_RESET,
      }),
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'mona@agency.com',
        text: expect.stringContaining(
          'https://app.test/reset-password?token=raw-token',
        ) as string,
      }),
    );
  });

  it('silently does nothing for unknown accounts, pending invites and suspended tenants', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.requestPasswordReset('prime', 'ghost@x.com'),
    ).resolves.toBeUndefined();

    prisma.user.findFirst.mockResolvedValueOnce({
      ...activeUser,
      invitedAt: new Date(),
    });
    await service.requestPasswordReset('prime', 'mona@agency.com');

    tenantAccess.assertTenantAccessible.mockRejectedValueOnce(
      new Error('suspended'),
    );
    await service.requestPasswordReset('prime', 'mona@agency.com');

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('rate-limits repeated requests for the same user', async () => {
    tokens.issuedWithin.mockResolvedValue(true);

    await service.requestPasswordReset('prime', 'mona@agency.com');

    expect(tokens.issue).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('resets the password and signs out every session', async () => {
    await service.resetPassword('raw-token', 'NewPass123');

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'hashed' },
    });
    expect(tx.userSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
    expect(audit.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_PASSWORD_RESET_SELF' }),
    );
  });

  it('rejects used or expired links with one generic error', async () => {
    tokens.consume.mockResolvedValue(null);

    await expect(service.resetPassword('stale', 'NewPass123')).rejects.toThrow(
      new BadRequestException('This link is invalid or has expired'),
    );
    await expect(
      service.acceptInvitation('stale', 'NewPass123'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('activates an invited account', async () => {
    await expect(
      service.acceptInvitation('raw-token', 'NewPass123'),
    ).resolves.toEqual({
      email: 'mona@agency.com',
      workspaceSlug: 'prime',
    });
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: 'hashed',
          inviteAcceptedAt: expect.any(Date) as Date,
        }) as Record<string, unknown>,
      }),
    );
  });
});
