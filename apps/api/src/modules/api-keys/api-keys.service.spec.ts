import { ApiKeysService, hashApiKey } from './api-keys.service';

describe('ApiKeysService', () => {
  let prisma: {
    apiKey: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: ApiKeysService;

  beforeEach(() => {
    prisma = {
      apiKey: {
        create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'key-1', ...data }),
        ),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };
    service = new ApiKeysService(
      prisma as never,
      { createAuditLog: jest.fn() } as never,
    );
  });

  it('returns the raw key once and stores only its hash', async () => {
    const created = await service.create('tenant-1', 'owner-1', 'Website form');

    expect(created.apiKey).toMatch(/^crm_live_/);
    const data = (
      prisma.apiKey.create.mock.calls[0] as [
        { data: { keyHash: string; prefix: string } },
      ]
    )[0].data;
    expect(data.keyHash).toBe(hashApiKey(created.apiKey));
    expect(created.apiKey.startsWith(data.prefix)).toBe(true);
    expect(JSON.stringify(data)).not.toContain(created.apiKey);
  });

  it('rejects unknown, malformed and revoked keys', async () => {
    await expect(service.authenticate('not-a-key')).resolves.toBeNull();

    prisma.apiKey.findUnique.mockResolvedValueOnce(null);
    await expect(service.authenticate('crm_live_unknown')).resolves.toBeNull();

    prisma.apiKey.findUnique.mockResolvedValueOnce({
      id: 'k',
      tenantId: 't',
      revokedAt: new Date(),
    });
    await expect(service.authenticate('crm_live_revoked')).resolves.toBeNull();

    prisma.apiKey.findUnique.mockResolvedValueOnce({
      id: 'k',
      tenantId: 't',
      revokedAt: null,
    });
    await expect(service.authenticate('crm_live_valid')).resolves.toEqual({
      id: 'k',
      tenantId: 't',
    });
  });
});
