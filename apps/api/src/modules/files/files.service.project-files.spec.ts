import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FileAssetCategory } from '@crmpro/database';
import { FilesService } from './files.service';

const scope = { kind: 'all' as const, actorUserId: 'user-1' };

function build() {
  const intent = {
    id: 'intent-1',
    objectKey: 'tenant/tenant-1/uploads/brochure.pdf',
    originalFilename: 'brochure.pdf',
    mimeType: 'application/pdf',
    sizeBytes: BigInt(1000),
    expiresAt: new Date(Date.now() + 60_000),
  };
  const tx = {
    fileAsset: {
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
          id: 'file-1',
          createdAt: new Date(),
          ...data,
        })),
      update: jest.fn(),
    },
    tenant: { update: jest.fn() },
    fileUploadIntent: { delete: jest.fn() },
  };
  const prisma = {
    fileUploadIntent: { findFirst: jest.fn().mockResolvedValue(intent) },
    project: { findFirst: jest.fn() },
    fileAsset: { findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const storage = {
    headObject: jest.fn().mockResolvedValue({
      contentLength: 1000,
      contentType: 'application/pdf',
    }),
    deleteFile: jest.fn(),
  };
  const service = new FilesService(
    prisma as never,
    { assertCanUseStorageInTransaction: jest.fn() } as never,
    storage as never,
    {} as never,
    {
      uploadCompleted: jest.fn(),
      uploadFailed: jest.fn(),
      fileDeleted: jest.fn(),
    } as never,
    {} as never,
    { createAuditLog: jest.fn() } as never,
  );
  return { service, prisma, tx, intent };
}

describe('FilesService project files', () => {
  const dto = {
    objectKey: 'tenant/tenant-1/uploads/brochure.pdf',
    category: FileAssetCategory.PROJECT_BROCHURE,
    projectId: 'project-1',
  };

  it('needs project.update to upload a project file', async () => {
    const { service } = build();

    await expect(
      service.completeUpload('tenant-1', 'user-1', dto, scope, false),
    ).rejects.toThrow(ForbiddenException);
  });

  it('only attaches to a project of the same tenant', async () => {
    const { service, prisma } = build();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      service.completeUpload('tenant-1', 'user-1', dto, scope, true),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'project-1', tenantId: 'tenant-1', deletedAt: null },
      select: { id: true },
    });
  });

  it('stores the project id on the file', async () => {
    const { service, prisma, tx } = build();
    prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });

    const file = await service.completeUpload(
      'tenant-1',
      'user-1',
      dto,
      scope,
      true,
    );

    expect(tx.fileAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'project-1',
          leadId: null,
        }) as unknown,
      }),
    );
    expect(file.projectId).toBe('project-1');
  });

  it('needs project.update to delete a project file', async () => {
    const { service, prisma } = build();
    prisma.fileAsset.findFirst.mockResolvedValue({
      id: 'file-1',
      category: FileAssetCategory.PROJECT_BROCHURE,
      sizeBytes: BigInt(10),
      leadId: null,
      projectId: 'project-1',
    });

    await expect(
      service.deleteFile('file-1', 'tenant-1', 'user-1', scope, false),
    ).rejects.toThrow(ForbiddenException);
  });
});
