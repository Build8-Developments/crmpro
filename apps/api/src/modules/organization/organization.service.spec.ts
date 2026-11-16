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

    expect(files.completeUpload).toHaveBeenCalledWith('tenant-1', 'user-1', {
      objectKey: 'tenants/tenant-1/new.png',
      category: 'LOGO',
    });
    expect(tx.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { logoFileId: 'new-logo' },
    });
    expect(files.deleteFile).toHaveBeenCalledWith(
      'old-logo',
      'tenant-1',
      'user-1',
    );
    expect(result.logoUrl).toBe('https://signed/logo');
  });

  it('reports plan usage against limits (null = unlimited)', async () => {
    prisma.tenant.findFirst.mockResolvedValueOnce({
      status: 'ACTIVE',
      storageUsedBytes: 1024n,
      subscriptionPlan: {
        name: 'Growth',
        featureFlags: { analytics: true },
        maxUsers: 10,
        maxLeads: null,
        maxProjects: 50,
        maxStorageBytes: 5_368_709_120n,
      },
      contracts: [],
    });

    await expect(service.getUsage('tenant-1')).resolves.toEqual({
      plan: {
        name: 'Growth',
        features: { analytics: true, importExport: false },
      },
      status: 'ACTIVE',
      contract: null,
      usage: {
        users: { used: 4, limit: 10 },
        leads: { used: 120, limit: null },
        projects: { used: 9, limit: 50 },
        storageBytes: { used: 1024, limit: 5_368_709_120 },
      },
    });
  });
});
