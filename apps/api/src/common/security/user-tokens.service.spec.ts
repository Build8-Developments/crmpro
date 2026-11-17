import { UserTokenType } from '@crmpro/database';
import { hashUserToken, UserTokensService } from './user-tokens.service';

describe('UserTokensService', () => {
  let prisma: {
    userToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let service: UserTokensService;

  beforeEach(() => {
    prisma = {
      userToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 't',
          tenantId: 'tenant-1',
          userId: 'user-1',
        }),
      },
    };
    service = new UserTokensService(prisma as never);
  });

  it('stores only a hash and retires older tokens of the same type', async () => {
    const raw = await service.issue({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: UserTokenType.PASSWORD_RESET,
      ttlMs: 60_000,
    });

    expect(raw.length).toBeGreaterThanOrEqual(43);
    expect(prisma.userToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          type: UserTokenType.PASSWORD_RESET,
          usedAt: null,
        },
      }),
    );
    const created = (
      prisma.userToken.create.mock.calls[0] as [{ data: { tokenHash: string } }]
    )[0].data;
    expect(created.tokenHash).toBe(hashUserToken(raw));
    expect(JSON.stringify(prisma.userToken.create.mock.calls)).not.toContain(
      raw,
    );
  });

  it('consumes a token at most once', async () => {
    const tx = prisma as never;
    await expect(
      service.consume('raw', UserTokenType.INVITE, tx),
    ).resolves.toEqual({
      id: 't',
      tenantId: 'tenant-1',
      userId: 'user-1',
    });

    prisma.userToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.consume('raw', UserTokenType.INVITE, tx),
    ).resolves.toBeNull();
  });
});
