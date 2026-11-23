import { SYSTEM_LEAD_SCOPE } from '../../common/auth';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { FilesService } from '../files/files.service';
import { OrganizationService } from './organization.service';
import { TenantSettingsService } from './tenant-settings.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let tx: {
    tenant: { update: jest.Mock };
    tenantSettings: { update: jest.Mock };
  };
  let prisma: {
    tenant: { findFirst: jest.Mock };
    tenantContract: { findFirst: jest.Mock };
    user: { count: jest.Mock };
    lead: { count: jest.Mock };
    project: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let tenantSettings: { get: jest.Mock };
  let files: { completeUpload: jest.Mock; deleteFile: jest.Mock };
  let audit: { createAuditLog: jest.Mock };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    sessionId: 'session-1',
  };

  const settingsRow = {
    tenantId: 'tenant-1',
    countryCode: 'EG',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    weekStartsOn: 6,
    workingDays: [0, 1, 2, 3, 4, 6],
    workdayStartMinute: 600,
    workdayEndMinute: 1140,
    firstContactSlaMinutes: 15,
    escalateAfterMinutes: 30,
    dailyInteractionGoal: 25,
    showLeaderboardToAgents: true,
    updatedAt: new Date('2026-11-16T00:00:00Z'),
    updatedByUserId: null,
  };

  const tenantRow = {
    id: 'tenant-1',
    name: 'Prime Estates',
    slug: 'prime-estates',
    status: 'ACTIVE',
    logoFileId: 'old-logo',
    logoFile: { objectKey: 'tenants/tenant-1/old.png', deletedAt: null },
  };

  beforeEach(async () => {
    tx = {
      tenant: { update: jest.fn() },
      tenantSettings: {
        update: jest.fn(async ({ data }) => ({ ...settingsRow, ...data })),
      },
    };
    prisma = {
      tenant: { findFirst: jest.fn().mockResolvedValue(tenantRow) },
      tenantContract: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { count: jest.fn().mockResolvedValue(4) },
      lead: { count: jest.fn().mockResolvedValue(120) },
      project: { count: jest.fn().mockResolvedValue(9) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    tenantSettings = { get: jest.fn().mockResolvedValue(settingsRow) };
    files = {
      completeUpload: jest.fn().mockResolvedValue({ id: 'new-logo' }),
      deleteFile: jest.fn(),
    };
    audit = { createAuditLog: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StorageService,
          useValue: {
            getSignedDownloadUrl: jest
              .fn()
              .mockResolvedValue({ url: 'https://signed/logo' }),
          },
        },
        { provide: FilesService, useValue: files },
        { provide: AuditWriterService, useValue: audit },
        { provide: TenantSettingsService, useValue: tenantSettings },
      ],
    }).compile();

    service = module.get(OrganizationService);
  });

  describe('updateSettings', () => {
    it('writes and audits only the fields that changed', async () => {
      const result = await service.updateSettings(user, {
        timezone: 'Africa/Cairo',
        weekStartsOn: 0,
        currency: 'USD',
      });

      expect(tx.tenantSettings.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: { weekStartsOn: 0, currency: 'USD', updatedByUserId: 'user-1' },
      });
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORGANIZATION_SETTINGS_UPDATED',
          metadata: {
            changes: {
              currency: { from: 'EGP', to: 'USD' },
              weekStartsOn: { from: 6, to: 0 },
            },
          },
        }),
      );
      expect(result).toMatchObject({ currency: 'USD', weekStartsOn: 0 });
    });

    it('does nothing when no value changes', async () => {
      await service.updateSettings(user, { currency: 'EGP' });

      expect(tx.tenantSettings.update).not.toHaveBeenCalled();
      expect(audit.createAuditLog).not.toHaveBeenCalled();
    });

    it('rejects an unknown currency code', async () => {
      await expect(
        service.updateSettings(user, { currency: 'XYZ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateOrganization', () => {
    it('renames and audits the change', async () => {
      await service.updateOrganization(user, { name: 'Prime Homes' });

      expect(tx.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { name: 'Prime Homes' },
      });
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            changes: { name: { from: 'Prime Estates', to: 'Prime Homes' } },
          },
        }),
      );
    });

    it('skips the write when the name is unchanged', async () => {
      await service.updateOrganization(user, { name: 'Prime Estates' });
      expect(tx.tenant.update).not.toHaveBeenCalled();
    });
  });

  it('replaces the logo and deletes the previous file', async () => {
    const result = await service.completeLogoUpload(user, {
      objectKey: 'tenants/tenant-1/new.png',
    });

    expect(files.completeUpload).toHaveBeenCalledWith(
      'tenant-1',
      'user-1',
      {
        objectKey: 'tenants/tenant-1/new.png',
        category: 'LOGO',
      },
      SYSTEM_LEAD_SCOPE,
    );
    expect(tx.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { logoFileId: 'new-logo' },
    });
    expect(files.deleteFile).toHaveBeenCalledWith(
      'old-logo',
      'tenant-1',
      'user-1',
      SYSTEM_LEAD_SCOPE,
    );
    expect(result.logoUrl).toBe('https://signed/logo');
  });

  describe('getUsage', () => {
    const livePlan = {
      name: 'Growth',
      featureFlags: { analytics: true },
      maxUsers: 10,
      maxLeads: null,
      maxProjects: 50,
      maxStorageBytes: 5_368_709_120n,
    };

    function mockTenant() {
      prisma.tenant.findFirst
        // getUsage: tenant row
        .mockResolvedValueOnce({
          status: 'ACTIVE',
          storageUsedBytes: 1024n,
          subscriptionPlan: { name: 'Growth' },
        })
        // plan terms: live plan
        .mockResolvedValueOnce({ subscriptionPlan: livePlan });
    }

    it('reports plan usage against live limits without a contract (null = unlimited)', async () => {
      mockTenant();
      prisma.tenantContract.findFirst.mockResolvedValue(null);

      await expect(service.getUsage('tenant-1')).resolves.toEqual({
        plan: {
          name: 'Growth',
          features: { analytics: true, importExport: false },
        },
        status: 'ACTIVE',
        contract: null,
        limits: { source: 'live', capturedAt: null },
        usage: {
          users: { used: 4, limit: 10 },
          leads: { used: 120, limit: null },
          projects: { used: 9, limit: 50 },
          storageBytes: { used: 1024, limit: 5_368_709_120 },
        },
      });
    });

    it('shows the signed terms, the snapshot limits and the termination', async () => {
      mockTenant();
      const contractRow = {
        status: 'TERMINATED',
        contractStartAt: new Date('2026-01-01T00:00:00Z'),
        contractEndAt: new Date('2026-12-31T00:00:00Z'),
        gracePeriodDays: 12,
        autoRenew: false,
        agreedPrice: { toNumber: () => 7000 },
        currency: 'EGP',
        paymentMethod: 'BANK_TRANSFER',
        paymentFrequency: 'ANNUAL',
        terminatedAt: new Date('2026-11-23T10:00:00Z'),
        terminationMode: 'READ_ONLY',
        accessEndsAt: new Date('2027-01-12T23:59:59.999Z'),
      };
      prisma.tenantContract.findFirst
        // no active contract
        .mockResolvedValueOnce(null)
        // latest terminated one, with its snapshot
        .mockResolvedValueOnce({
          id: 'contract-1',
          planSnapshot: {
            version: 1,
            planId: 'plan-growth',
            name: 'Growth (2026)',
            price: 7000,
            currency: 'EGP',
            quotas: {
              maxUsers: 5,
              maxLeads: 1000,
              maxProjects: 20,
              maxStorageBytes: '1000',
            },
            featureFlags: { analytics: false, importExport: true },
            capturedAt: '2026-01-01T09:00:00.000Z',
          },
        })
        // the contract's terms
        .mockResolvedValueOnce(contractRow);

      const usage = await service.getUsage('tenant-1', {
        includePricing: true,
      });

      expect(usage.plan).toEqual({
        name: 'Growth (2026)',
        features: { analytics: false, importExport: true },
      });
      expect(usage.limits).toEqual({
        source: 'snapshot',
        capturedAt: '2026-01-01T09:00:00.000Z',
      });
      expect(usage.usage.users).toEqual({ used: 4, limit: 5 });
      expect(usage.usage.storageBytes).toEqual({ used: 1024, limit: 1000 });
      expect(usage.contract).toEqual(
        expect.objectContaining({
          planName: 'Growth (2026)',
          gracePeriodDays: 12,
          pricing: {
            agreedPrice: 7000,
            currency: 'EGP',
            paymentMethod: 'BANK_TRANSFER',
            paymentFrequency: 'ANNUAL',
          },
          termination: {
            mode: 'READ_ONLY',
            terminatedAt: contractRow.terminatedAt,
            accessEndsAt: contractRow.accessEndsAt,
          },
        }),
      );
    });

    it('leaves out price and payment terms without billing access', async () => {
      mockTenant();
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce({ id: 'contract-1', planSnapshot: null })
        .mockResolvedValueOnce({
          status: 'ACTIVE',
          contractStartAt: new Date('2026-01-01T00:00:00Z'),
          contractEndAt: null,
          gracePeriodDays: null,
          autoRenew: true,
          agreedPrice: { toNumber: () => 7000 },
          currency: 'EGP',
          paymentMethod: 'CASH',
          paymentFrequency: 'MONTHLY',
          terminatedAt: null,
          terminationMode: null,
          accessEndsAt: null,
        });

      const usage = await service.getUsage('tenant-1');

      expect(usage.contract?.pricing).toBeNull();
      expect(usage.contract?.termination).toBeNull();
      // Legacy contract without snapshot: live limits.
      expect(usage.limits.source).toBe('live');
    });
  });

  describe('updateSettings — workday', () => {
    it('saves working days sorted and audits the change', async () => {
      tx.tenantSettings.update.mockResolvedValue({
        ...settingsRow,
        workingDays: [0, 1, 2, 3, 4],
      });

      await service.updateSettings(user, { workingDays: [4, 3, 2, 1, 0] });

      expect(tx.tenantSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ workingDays: [0, 1, 2, 3, 4] }),
        }),
      );
    });

    it('refuses a workday shorter than an hour', async () => {
      await expect(
        service.updateSettings(user, { workdayEndMinute: 630 }),
      ).rejects.toThrow('at least an hour');
    });

    it('refuses an escalation earlier than the first-call deadline', async () => {
      await expect(
        service.updateSettings(user, { firstContactSlaMinutes: 45 }),
      ).rejects.toThrow('after the first-call deadline');
    });
  });
});
