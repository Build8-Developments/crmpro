import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FileAssetCategory } from '@crmpro/database';
import { type LeadScope, SYSTEM_LEAD_SCOPE } from '../../common/auth';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { StorageLoggingService } from '../../common/logging/storage-logging.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { LeadAttachmentService } from '../lead-attachments/lead-attachment.service';
import { FilesService } from './files.service';
import { FileThumbnailService } from './thumbnails/file-thumbnail.service';

const OWN_SCOPE: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

/** The clause that keeps import/export files to their creator. */
const jobFileClause = (userId: string) => ({
  OR: [
    {
      category: {
        notIn: [FileAssetCategory.IMPORT_FILE, FileAssetCategory.EXPORT_FILE],
      },
    },
    { uploadedByUserId: userId },
  ],
});

describe('FilesService lead scope for import and export files', () => {
  let service: FilesService;
  let prisma: {
    $transaction: jest.Mock;
    fileAsset: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
      fileAsset: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuotaService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: LeadAttachmentService, useValue: {} },
        { provide: StorageLoggingService, useValue: {} },
        { provide: NotificationTriggerService, useValue: {} },
        { provide: AuditWriterService, useValue: {} },
        { provide: FileThumbnailService, useValue: { ensure: jest.fn() } },
      ],
    }).compile();

    service = module.get(FilesService);
  });

  it('limits a scoped user listing exports to the ones they created', async () => {
    await service.listFiles(
      'tenant-1',
      { category: FileAssetCategory.EXPORT_FILE, page: 1, limit: 20 },
      { lockedFolderIds: [], leadScope: OWN_SCOPE },
    );

    const where = prisma.fileAsset.findMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe('tenant-1');
    expect(where.AND).toContainEqual({
      category: FileAssetCategory.EXPORT_FILE,
    });
    expect(JSON.stringify(where.AND)).toContain(
      JSON.stringify(jobFileClause('agent-1')),
    );
  });

  it('refuses a download URL for an export the scoped user did not create', async () => {
    await expect(
      service.getDownloadUrl('export-file', 'tenant-1', OWN_SCOPE),
    ).rejects.toBeInstanceOf(NotFoundException);

    const where = prisma.fileAsset.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ id: 'export-file', tenantId: 'tenant-1' });
    expect(where.AND).toContainEqual(jobFileClause('agent-1'));
  });

  it('does not restrict the all-leads scope', async () => {
    await expect(
      service.getDownloadUrl('export-file', 'tenant-1', SYSTEM_LEAD_SCOPE),
    ).rejects.toBeInstanceOf(NotFoundException);

    const where = prisma.fileAsset.findFirst.mock.calls[0][0].where;
    expect(where.AND).toBeUndefined();
    expect(JSON.stringify(where)).not.toContain('uploadedByUserId');
  });
});
