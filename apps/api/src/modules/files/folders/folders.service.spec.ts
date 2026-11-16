import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from '../../../common/auth/services/permissions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordService } from '../../../common/security/password.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import {
  FolderAccessService,
  type FolderAccessSnapshot,
  type FolderNode,
} from './folder-access.service';
import { FoldersService } from './folders.service';

const node = (
  id: string,
  parentId: string | null,
  extra: Partial<FolderNode> = {},
): FolderNode => ({
  id,
  parentId,
  name: id,
  hasPassword: false,
  createdByUserId: 'owner-of-folders',
  createdByName: 'Owner',
  createdAt: new Date(),
  ...extra,
});

describe('FoldersService', () => {
  let service: FoldersService;
  let snapshot: FolderAccessSnapshot;
  let tx: {
    fileFolder: { create: jest.Mock; update: jest.Mock };
    fileAsset: { updateMany: jest.Mock };
  };
  let prisma: {
    fileFolder: { findFirst: jest.Mock };
    fileAsset: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
    $transaction: jest.Mock;
  };
  let permissionKeys: Set<string>;

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    sessionId: 'session-1',
  };

  beforeEach(async () => {
    // a ── b ── c,  d (root)
    snapshot = {
      folders: new Map([
        ['a', node('a', null, { createdByUserId: 'user-1' })],
        ['b', node('b', 'a', { createdByUserId: 'user-1' })],
        ['c', node('c', 'b')],
        ['d', node('d', null)],
      ]),
      lockedIds: new Set(),
      lockRootOf: new Map(),
    };
    permissionKeys = new Set(['file.upload']);

    tx = {
      fileFolder: {
        create: jest.fn(async ({ data }) => ({
          id: 'new',
          createdAt: new Date(),
          ...data,
        })),
        update: jest.fn(),
      },
      fileAsset: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    prisma = {
      fileFolder: { findFirst: jest.fn() },
      fileAsset: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    const access = {
      snapshot: jest.fn(async () => snapshot),
      assertAccessible: jest.fn((snap: FolderAccessSnapshot, id: string) => {
        if (snap.lockedIds.has(id)) throw new ForbiddenException('locked');
        return snap.folders.get(id);
      }),
      unlock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: PrismaService, useValue: prisma },
        { provide: FolderAccessService, useValue: access },
        {
          provide: PasswordService,
          useValue: {
            hash: jest.fn(async (p: string) => `hash:${p}`),
            verify: jest.fn(async (h: string, p: string) => h === `hash:${p}`),
          },
        },
        {
          provide: PermissionsService,
          useValue: {
            getPermissionKeysForUser: jest.fn(async () => permissionKeys),
          },
        },
        { provide: AuditWriterService, useValue: { createAuditLog: jest.fn() } },
      ],
    }).compile();

    service = module.get(FoldersService);
  });

  it('rejects a sibling with the same name (case-insensitive)', async () => {
    await expect(
      service.createFolder(user, { name: 'B', parentId: 'a' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to create inside a locked folder', async () => {
    snapshot.lockedIds.add('a');
    await expect(
      service.createFolder(user, { name: 'x', parentId: 'a' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses to move a folder into its own subtree', async () => {
    await expect(
      service.updateFolder(user, 'a', { parentId: 'b' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses to rename someone else's folder without file.manage", async () => {
    await expect(
      service.updateFolder(user, 'd', { name: 'Renamed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    permissionKeys.add('file.manage');
    await expect(
      service.updateFolder(user, 'd', { name: 'Renamed' }),
    ).resolves.toEqual({ id: 'd' });
  });

  it('only deletes empty folders', async () => {
    await expect(service.deleteFolder(user, 'a')).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.fileAsset.count.mockResolvedValue(2);
    snapshot.folders.set('e', node('e', null, { createdByUserId: 'user-1' }));
    await expect(service.deleteFolder(user, 'e')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  describe('setPassword', () => {
    const protectedFolder = {
      id: 'a',
      name: 'a',
      parentId: null,
      passwordHash: 'hash:old-secret',
      createdByUserId: 'user-1',
    };

    it('lets the owner change it with the current password', async () => {
      prisma.fileFolder.findFirst.mockResolvedValue(protectedFolder);

      await expect(
        service.setPassword(user, 'a', {
          currentPassword: 'old-secret',
          newPassword: 'new-secret',
        }),
      ).resolves.toEqual({ id: 'a', isPrivate: true });
    });

    it('requires the current password from a non-manager owner', async () => {
      prisma.fileFolder.findFirst.mockResolvedValue(protectedFolder);

      await expect(
        service.setPassword(user, 'a', { newPassword: 'new-secret' }),
      ).rejects.toThrow('Enter the current folder password');
    });

    it('lets file.manage reset a forgotten password without it', async () => {
      permissionKeys.add('file.manage');
      prisma.fileFolder.findFirst.mockResolvedValue({
        ...protectedFolder,
        createdByUserId: 'someone-else',
      });

      await expect(
        service.setPassword(user, 'a', { newPassword: 'new-secret' }),
      ).resolves.toEqual({ id: 'a', isPrivate: true });
    });

    it('forbids strangers entirely', async () => {
      prisma.fileFolder.findFirst.mockResolvedValue({
        ...protectedFolder,
        createdByUserId: 'someone-else',
      });

      await expect(
        service.setPassword(user, 'a', {
          currentPassword: 'old-secret',
          newPassword: null,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('moveFiles', () => {
    it('keeps system files out of gallery folders', async () => {
      prisma.fileAsset.findMany.mockResolvedValue([
        {
          id: 'f1',
          category: 'LEAD_ATTACHMENT',
          folderId: null,
          uploadedByUserId: 'user-1',
        },
      ]);

      await expect(
        service.moveFiles(user, { fileIds: ['f1'], folderId: 'a' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses to move other people's files without file.manage", async () => {
      prisma.fileAsset.findMany.mockResolvedValue([
        { id: 'f1', category: 'OTHER', folderId: null, uploadedByUserId: 'x' },
      ]);

      await expect(
        service.moveFiles(user, { fileIds: ['f1'], folderId: 'a' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses to pull files out of a locked folder', async () => {
      snapshot.lockedIds.add('d');
      prisma.fileAsset.findMany.mockResolvedValue([
        {
          id: 'f1',
          category: 'OTHER',
          folderId: 'd',
          uploadedByUserId: 'user-1',
        },
      ]);

      await expect(
        service.moveFiles(user, { fileIds: ['f1'], folderId: null }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('moves own files between open folders', async () => {
      prisma.fileAsset.findMany.mockResolvedValue([
        { id: 'f1', category: 'OTHER', folderId: 'a', uploadedByUserId: 'user-1' },
      ]);

      await expect(
        service.moveFiles(user, { fileIds: ['f1'], folderId: 'd' }),
      ).resolves.toEqual({ moved: 1 });
      expect(tx.fileAsset.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['f1'] }, tenantId: 'tenant-1' },
        data: { folderId: 'd' },
      });
    });
  });
});
