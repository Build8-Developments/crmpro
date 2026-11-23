import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  API_KEY_DISPLAY_PREFIX_LENGTH,
  MAX_ACTIVE_API_KEYS_PER_TENANT,
} from './api-keys.constants';
import { ApiKeysService, hashApiKey } from './api-keys.service';

type CreateArgs = {
  data: {
    keyHash: string;
    prefix: string;
    sourceId: string | null;
    name: string;
  };
};

describe('ApiKeysService', () => {
  let prisma: {
    apiKey: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    leadSource: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { createAuditLog: jest.Mock };
  let service: ApiKeysService;

  const record = (overrides: Record<string, unknown> = {}) => ({
    id: 'key-1',
    name: 'Website form',
    prefix: 'crm_live_Ab3x',
    sourceId: null,
    lastUsedAt: null,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    revokedAt: null,
    createdBy: { id: 'owner-1', name: 'Mona Owner' },
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      apiKey: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(({ data }: CreateArgs) =>
          Promise.resolve(record({ ...data, id: 'key-new' })),
        ),
        update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(record(data)),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      leadSource: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };
    audit = { createAuditLog: jest.fn().mockResolvedValue(undefined) };
    service = new ApiKeysService(prisma as never, audit as never);
  });

  describe('create', () => {
    it('returns the raw key once and stores only its hash and a short prefix', async () => {
      const created = await service.create('tenant-1', 'owner-1', {
        name: 'Website form',
      });

      expect(created.apiKey).toMatch(/^crm_live_[A-Za-z0-9_-]{43}$/);
      const { data } = (prisma.apiKey.create.mock.calls[0] as [CreateArgs])[0];
      expect(data.keyHash).toBe(hashApiKey(created.apiKey));
      expect(data.keyHash).toMatch(/^[a-f0-9]{64}$/);
      expect(data.prefix).toBe(
        created.apiKey.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
      );
      expect(JSON.stringify(data)).not.toContain(created.apiKey);
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          actorUserId: 'owner-1',
          action: 'API_KEY_CREATED',
          entityId: 'key-new',
        }),
      );
      expect(JSON.stringify(audit.createAuditLog.mock.calls)).not.toContain(
        created.apiKey,
      );
    });

    it('generates a different key every time', async () => {
      const first = await service.create('tenant-1', 'owner-1', { name: 'A' });
      const second = await service.create('tenant-1', 'owner-1', { name: 'B' });
      expect(first.apiKey).not.toBe(second.apiKey);
    });

    it('attaches a source that belongs to the tenant', async () => {
      prisma.leadSource.findMany.mockResolvedValue([
        { id: 'src-1', name: 'Facebook Ads' },
      ]);

      const created = await service.create('tenant-1', 'owner-1', {
        name: 'Zapier',
        sourceId: 'src-1',
      });

      expect(prisma.leadSource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', id: { in: ['src-1'] } },
        }),
      );
      expect(created.source).toEqual({ id: 'src-1', name: 'Facebook Ads' });
    });

    it("rejects another tenant's (or an unknown) source", async () => {
      await expect(
        service.create('tenant-1', 'owner-1', {
          name: 'Zapier',
          sourceId: 'src-other',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.apiKey.create).not.toHaveBeenCalled();
    });

    it('caps active keys per tenant', async () => {
      prisma.apiKey.count.mockResolvedValue(MAX_ACTIVE_API_KEYS_PER_TENANT);

      await expect(
        service.create('tenant-1', 'owner-1', { name: 'One too many' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.apiKey.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', revokedAt: null },
      });
    });
  });

  describe('revoke', () => {
    it('sets revokedAt and audits', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(record());

      const revoked = await service.revoke('tenant-1', 'owner-1', 'key-1');

      expect(prisma.apiKey.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-1', tenantId: 'tenant-1' },
        }),
      );
      expect(revoked.revokedAt).toBeInstanceOf(Date);
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'API_KEY_REVOKED',
          entityId: 'key-1',
        }),
      );
    });

    it('is a no-op on an already revoked key', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(
        record({ revokedAt: new Date() }),
      );

      await service.revoke('tenant-1', 'owner-1', 'key-1');

      expect(prisma.apiKey.update).not.toHaveBeenCalled();
      expect(audit.createAuditLog).not.toHaveBeenCalled();
    });

    it("404s on another tenant's key", async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(
        service.revoke('tenant-1', 'owner-1', 'key-x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findActiveKey', () => {
    it('skips the database for strings that are not our keys', async () => {
      await expect(service.findActiveKey('not-a-key')).resolves.toBeNull();
      await expect(
        service.findActiveKey(`crm_live_${'x'.repeat(500)}`),
      ).resolves.toBeNull();
      expect(prisma.apiKey.findUnique).not.toHaveBeenCalled();
    });

    it('looks keys up by hash and rejects unknown and revoked ones', async () => {
      prisma.apiKey.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.findActiveKey('crm_live_unknown'),
      ).resolves.toBeNull();
      expect(prisma.apiKey.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { keyHash: hashApiKey('crm_live_unknown') },
        }),
      );

      prisma.apiKey.findUnique.mockResolvedValueOnce({
        ...record(),
        tenantId: 'tenant-1',
        revokedAt: new Date(),
      });
      await expect(
        service.findActiveKey('crm_live_revoked'),
      ).resolves.toBeNull();

      prisma.apiKey.findUnique.mockResolvedValueOnce({
        ...record({ sourceId: 'src-1' }),
        tenantId: 'tenant-1',
      });
      await expect(service.findActiveKey('crm_live_valid')).resolves.toEqual({
        id: 'key-1',
        tenantId: 'tenant-1',
        name: 'Website form',
        sourceId: 'src-1',
        lastUsedAt: null,
      });
    });
  });

  describe('touchLastUsed', () => {
    const now = new Date('2026-11-17T12:00:00Z');

    it('skips the write when the key was used within the interval', async () => {
      await service.touchLastUsed(
        { id: 'key-1', lastUsedAt: new Date('2026-11-17T11:59:30Z') },
        now,
        60_000,
      );
      expect(prisma.apiKey.updateMany).not.toHaveBeenCalled();
    });

    it('writes when stale, guarded against concurrent writers', async () => {
      await service.touchLastUsed(
        { id: 'key-1', lastUsedAt: new Date('2026-11-17T11:50:00Z') },
        now,
        60_000,
      );
      expect(prisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'key-1',
          OR: [
            { lastUsedAt: null },
            { lastUsedAt: { lt: new Date('2026-11-17T11:59:00Z') } },
          ],
        },
        data: { lastUsedAt: now },
      });
    });

    it('never throws', async () => {
      prisma.apiKey.updateMany.mockRejectedValue(new Error('db down'));
      await expect(
        service.touchLastUsed({ id: 'key-1', lastUsedAt: null }, now, 60_000),
      ).resolves.toBeUndefined();
    });
  });
});
