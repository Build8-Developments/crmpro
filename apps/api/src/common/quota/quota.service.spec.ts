import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { QUOTA_EXCEEDED_MESSAGES } from './quota.constants';
import { QuotaService } from './quota.service';

describe('QuotaService', () => {
  let service: QuotaService;
  let prisma: {
    tenant: { findFirst: jest.Mock };
    tenantContract: { findFirst: jest.Mock };
    lead: { count: jest.Mock };
    project: { count: jest.Mock };
    user: { count: jest.Mock };
  };

  const starterPlan = {
    maxUsers: 5,
    maxLeads: 2,
    maxProjects: 10,
    maxStorageBytes: null,
    featureFlags: {},
  };

  /** The plan as signed: Starter with 2 leads, 5 users, 10 projects, 100 bytes. */
  const signedSnapshot = {
    version: 1,
    planId: 'plan-starter',
    name: 'Starter',
    price: 500,
    currency: 'EGP',
    quotas: {
      maxUsers: 5,
      maxLeads: 2,
      maxProjects: 10,
      maxStorageBytes: '100',
    },
    featureFlags: { analytics: false },
    capturedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findFirst: jest.fn().mockResolvedValue({
          subscriptionPlan: starterPlan,
        }),
      },
      // Legacy tenant: no contract snapshot, live plan applies.
      tenantContract: { findFirst: jest.fn().mockResolvedValue(null) },
      lead: { count: jest.fn() },
      project: { count: jest.fn() },
      user: { count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuotaService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(QuotaService);
  });

  describe('assertCanCreateLead', () => {
    it('allows creation when below Starter lead limit', async () => {
      prisma.lead.count.mockResolvedValue(1);

      await expect(
        service.assertCanCreateLead('tenant-1'),
      ).resolves.toBeUndefined();
    });

    it('rejects creation when at Starter lead limit', async () => {
      prisma.lead.count.mockResolvedValue(2);

      await expect(service.assertCanCreateLead('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.LEAD),
      );
    });

    it('allows unlimited leads when plan limit is null', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        subscriptionPlan: { ...starterPlan, maxLeads: null },
      });
      prisma.lead.count.mockResolvedValue(1_000_000);

      await expect(
        service.assertCanCreateLead('tenant-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('canCreateLead', () => {
    it('returns false when quota exceeded', async () => {
      prisma.lead.count.mockResolvedValue(2);

      await expect(service.canCreateLead('tenant-1')).resolves.toBe(false);
    });
  });

  describe('assertCanCreateProject', () => {
    it('rejects creation when at project limit', async () => {
      prisma.project.count.mockResolvedValue(10);

      await expect(service.assertCanCreateProject('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.PROJECT),
      );
    });
  });

  describe('assertCanCreateUser', () => {
    it('rejects creation when at user limit', async () => {
      prisma.user.count.mockResolvedValue(5);

      await expect(service.assertCanCreateUser('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.USER),
      );
    });
  });

  describe('contract plan snapshot', () => {
    it('keeps the signed limits when the plan is edited after signing', async () => {
      // Plan now allows 1000 leads, but the tenant signed for 2.
      prisma.tenant.findFirst.mockResolvedValue({
        subscriptionPlan: { ...starterPlan, maxLeads: 1000, maxUsers: 50 },
      });
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: signedSnapshot,
      });
      prisma.lead.count.mockResolvedValue(2);

      await expect(service.assertCanCreateLead('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.LEAD),
      );
      expect(prisma.tenantContract.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('keeps the signed limits when the plan is tightened after signing', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        subscriptionPlan: { ...starterPlan, maxLeads: 1 },
      });
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: signedSnapshot,
      });
      prisma.lead.count.mockResolvedValue(1);

      await expect(
        service.assertCanCreateLead('tenant-1'),
      ).resolves.toBeUndefined();
    });

    it('uses the terminated contract snapshot while access winds down', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        subscriptionPlan: { ...starterPlan, maxProjects: 1000 },
      });
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'contract-1',
          planSnapshot: signedSnapshot,
        });
      prisma.project.count.mockResolvedValue(10);

      await expect(service.assertCanCreateProject('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.PROJECT),
      );
    });

    it('fails closed on a malformed quota instead of treating it as unlimited', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        subscriptionPlan: { ...starterPlan, maxUsers: null },
      });
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: {
          ...signedSnapshot,
          quotas: { ...signedSnapshot.quotas, maxUsers: 'lots' },
        },
      });
      prisma.user.count.mockResolvedValue(0);

      await expect(service.assertCanCreateUser('tenant-1')).rejects.toThrow(
        new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.USER),
      );
    });

    it('fails closed when the quotas object is missing', async () => {
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: { ...signedSnapshot, quotas: undefined },
      });
      prisma.lead.count.mockResolvedValue(0);

      await expect(service.canCreateLead('tenant-1')).resolves.toBe(false);
    });

    it('keeps a signed unlimited quota unlimited', async () => {
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: {
          ...signedSnapshot,
          quotas: { ...signedSnapshot.quotas, maxLeads: null },
        },
      });
      prisma.lead.count.mockResolvedValue(1_000_000);

      await expect(service.canCreateLead('tenant-1')).resolves.toBe(true);
    });
  });

  it('throws when tenant is not found', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    await expect(service.assertCanCreateLead('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('transaction-safe quota checks', () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'tenant-1' }]),
      tenant: {
        findFirst: jest.fn().mockResolvedValue({
          storageUsedBytes: 0n,
          subscriptionPlan: starterPlan,
        }),
      },
      tenantContract: { findFirst: jest.fn().mockResolvedValue(null) },
      lead: { count: jest.fn() },
      project: { count: jest.fn() },
      user: { count: jest.fn() },
      fileUploadIntent: { aggregate: jest.fn() },
    };

    it('locks tenant row before counting leads in transaction', async () => {
      tx.lead.count.mockResolvedValue(1);

      await expect(
        service.assertCanCreateLeadInTransaction(tx as never, 'tenant-1'),
      ).resolves.toBeUndefined();

      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.lead.count).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', deletedAt: null },
      });
    });

    it('rejects lead creation in transaction when at limit', async () => {
      tx.lead.count.mockResolvedValue(2);

      await expect(
        service.assertCanCreateLeadInTransaction(tx as never, 'tenant-1'),
      ).rejects.toThrow(new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.LEAD));
    });

    it('rejects storage usage in transaction when projected usage exceeds limit', async () => {
      tx.tenant.findFirst.mockResolvedValue({
        storageUsedBytes: 100n,
        subscriptionPlan: {
          ...starterPlan,
          maxStorageBytes: 150n,
        },
      });
      tx.fileUploadIntent.aggregate.mockResolvedValue({
        _sum: { sizeBytes: 0n },
      });

      await expect(
        service.assertCanUseStorageInTransaction(tx as never, 'tenant-1', 100),
      ).rejects.toThrow('Storage quota exceeded');
    });

    it('includes pending upload intents when checking storage quota', async () => {
      tx.tenant.findFirst.mockResolvedValue({
        storageUsedBytes: 80n,
        subscriptionPlan: {
          ...starterPlan,
          maxStorageBytes: 100n,
        },
      });
      tx.fileUploadIntent.aggregate.mockResolvedValue({
        _sum: { sizeBytes: 15n },
      });

      await expect(
        service.assertCanUseStorageInTransaction(tx as never, 'tenant-1', 10),
      ).rejects.toThrow('Storage quota exceeded');

      expect(tx.fileUploadIntent.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            expiresAt: { gt: expect.any(Date) },
          }),
        }),
      );
    });

    it('enforces the signed storage limit inside the transaction', async () => {
      tx.tenant.findFirst.mockResolvedValue({
        storageUsedBytes: 90n,
        // Live plan is unlimited now; the tenant signed for 100 bytes.
        subscriptionPlan: { ...starterPlan, maxStorageBytes: null },
      });
      tx.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: signedSnapshot,
      });
      tx.fileUploadIntent.aggregate.mockResolvedValue({
        _sum: { sizeBytes: 0n },
      });

      await expect(
        service.assertCanUseStorageInTransaction(tx as never, 'tenant-1', 20),
      ).rejects.toThrow('Storage quota exceeded');
    });

    it('excludes the completing upload intent from pending storage reservation', async () => {
      tx.tenant.findFirst.mockResolvedValue({
        storageUsedBytes: 80n,
        subscriptionPlan: {
          ...starterPlan,
          maxStorageBytes: 100n,
        },
      });
      tx.fileUploadIntent.aggregate.mockResolvedValue({
        _sum: { sizeBytes: 0n },
      });

      await expect(
        service.assertCanUseStorageInTransaction(tx as never, 'tenant-1', 20, {
          excludeUploadIntentId: 'intent-1',
        }),
      ).resolves.toBeUndefined();

      expect(tx.fileUploadIntent.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'intent-1' },
          }),
        }),
      );
    });
  });
});
