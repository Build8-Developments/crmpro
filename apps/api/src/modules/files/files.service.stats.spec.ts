import { SYSTEM_LEAD_SCOPE } from '../../common/auth';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { StorageLoggingService } from '../../common/logging/storage-logging.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { LeadAttachmentService } from '../lead-attachments/lead-attachment.service';
import { FilesService, previewKindOf } from './files.service';
import { FileThumbnailService } from './thumbnails/file-thumbnail.service';

describe('FilesService.getStats', () => {
  let service: FilesService;
  let prisma: {
    fileAsset: { groupBy: jest.Mock };
    tenant: { findFirst: jest.Mock };
    user: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      fileAsset: {
        groupBy: jest
          .fn()
          // by mime type
          .mockResolvedValueOnce([
            {
              mimeType: 'image/png',
              _count: { _all: 3 },
              _sum: { sizeBytes: 300n },
            },
            {
              mimeType: 'image/jpeg',
              _count: { _all: 1 },
              _sum: { sizeBytes: 100n },
            },
            {
              mimeType: 'application/pdf',
              _count: { _all: 2 },
              _sum: { sizeBytes: 900n },
            },
          ])
          // by uploader
          .mockResolvedValueOnce([
            {
              uploadedByUserId: 'u1',
              _count: { _all: 4 },
              _sum: { sizeBytes: 1000n },
            },
            {
              uploadedByUserId: 'gone',
              _count: { _all: 2 },
              _sum: { sizeBytes: 300n },
            },
          ]),
      },
      tenant: {
        findFirst: jest.fn().mockResolvedValue({
          storageUsedBytes: 5000n,
          subscriptionPlan: { maxStorageBytes: 10000n },
        }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'u1', name: 'Sara' }]),
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

  it('groups by file kind, ranks uploaders and reports storage', async () => {
    const stats = await service.getStats(
      'tenant-1',
      {},
      { lockedFolderIds: ['locked'], leadScope: SYSTEM_LEAD_SCOPE },
    );

    expect(stats).toEqual({
      totalFiles: 6,
      totalBytes: 1300,
      byKind: [
        { kind: 'pdf', count: 2, bytes: 900 },
        { kind: 'image', count: 4, bytes: 400 },
      ],
      topUploaders: [
        { user: { id: 'u1', fullName: 'Sara' }, count: 4, bytes: 1000 },
        { user: { id: 'gone', fullName: 'Former user' }, count: 2, bytes: 300 },
      ],
      storage: { usedBytes: 5000, limitBytes: 10000 },
    });
  });

  it('applies the same lock rules as listing', async () => {
    await service.getStats(
      'tenant-1',
      { folderId: 'root' },
      { lockedFolderIds: ['locked'], leadScope: SYSTEM_LEAD_SCOPE },
    );

    const where = prisma.fileAsset.groupBy.mock.calls[0][0].where;
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { folderId: null, category: 'OTHER' },
        { OR: [{ folderId: null }, { folderId: { notIn: ['locked'] } }] },
      ]),
    );
  });
});

describe('previewKindOf', () => {
  it.each([
    ['image/png', 'image'],
    ['image/jpeg', 'image'],
    ['application/pdf', 'pdf'],
    ['video/mp4', 'video'],
    ['audio/mpeg', 'audio'],
    ['text/csv', 'text'],
    // Never inline: could run script from the storage origin.
    ['image/svg+xml', null],
    ['text/html', null],
    ['application/vnd.ms-excel', null],
  ])('%s → %s', (mime, kind) => {
    expect(previewKindOf(mime)).toBe(kind);
  });
});
