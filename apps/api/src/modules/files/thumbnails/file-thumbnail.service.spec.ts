import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../../common/cache/cache.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../common/storage/storage.service';
import {
  FileThumbnailService,
  supportsThumbnail,
} from './file-thumbnail.service';

// pdfjs is ESM-only; the real renderer is exercised against the running API.
jest.mock('./thumbnail-renderer', () => ({
  renderPdfFirstPage: jest.fn(async () =>
    Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]),
  ),
  resizeImage: jest.fn(async () => Buffer.from('RIFF0000WEBP')),
}));

/** Smallest valid one-page PDF with a line of text. */
function samplePdf(): Buffer {
  const content = 'BT /F1 36 Tf 72 700 Td (Brochure) Tj ET';
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n',
    `4 0 obj<</Length ${content.length}>>stream\n${content}\nendstream endobj\n`,
    '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

describe('FileThumbnailService', () => {
  let service: FileThumbnailService;
  let storage: { getObject: jest.Mock; uploadFile: jest.Mock; deleteFile: jest.Mock };
  let prisma: { fileAsset: { updateMany: jest.Mock } };
  let attempts: Map<string, number>;

  beforeEach(async () => {
    attempts = new Map();
    storage = {
      getObject: jest.fn().mockResolvedValue(samplePdf()),
      uploadFile: jest.fn().mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    prisma = { fileAsset: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileThumbnailService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        {
          provide: CacheService,
          useValue: {
            incrementWithTtl: jest.fn(async (key: string) => {
              const next = (attempts.get(key) ?? 0) + 1;
              attempts.set(key, next);
              return next;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(FileThumbnailService);
  });

  const pdfFile = {
    id: 'file-1',
    tenantId: 'tenant-1',
    objectKey: 'tenants/tenant-1/files/a/brochure.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048n,
    thumbnailObjectKey: null,
  };

  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

  it('stores the rendered WebP next to the file and records it', async () => {
    service.ensure([pdfFile]);
    await settle();

    expect(storage.uploadFile).toHaveBeenCalledTimes(1);
    const upload = storage.uploadFile.mock.calls[0][0];
    expect(upload.key).toBe(`${pdfFile.objectKey}.thumb.webp`);
    expect(upload.contentType).toBe('image/webp');
    // WebP files start with "RIFF....WEBP".
    expect(upload.buffer.subarray(0, 4).toString()).toBe('RIFF');
    expect(upload.buffer.subarray(8, 12).toString()).toBe('WEBP');
    expect(prisma.fileAsset.updateMany).toHaveBeenCalledWith({
      where: { id: 'file-1', tenantId: 'tenant-1', deletedAt: null },
      data: { thumbnailObjectKey: `${pdfFile.objectKey}.thumb.webp` },
    });
  }, 15000);

  it('tries each file once per window', async () => {
    service.ensure([pdfFile]);
    service.ensure([pdfFile]);
    await settle();

    expect(storage.getObject).toHaveBeenCalledTimes(1);
  }, 15000);

  it('skips files that already have one, unsupported types and huge files', async () => {
    service.ensure([
      { ...pdfFile, thumbnailObjectKey: 'done.webp' },
      { ...pdfFile, id: 'zip', mimeType: 'application/zip' },
      { ...pdfFile, id: 'big', sizeBytes: 100n * 1024n * 1024n },
    ]);
    await settle();

    expect(storage.getObject).not.toHaveBeenCalled();
    expect(supportsThumbnail('image/svg+xml')).toBe(false);
  }, 15000);

  it('cleans up the thumbnail if the file was deleted meanwhile', async () => {
    prisma.fileAsset.updateMany.mockResolvedValue({ count: 0 });
    service.ensure([pdfFile]);
    await settle();

    expect(storage.deleteFile).toHaveBeenCalledWith(
      `${pdfFile.objectKey}.thumb.webp`,
    );
  }, 15000);
});
