import { CanActivate, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PERMISSIONS_METADATA_KEY } from '../../common/auth/constants';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { PermissionsService } from '../../common/auth/services/permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FolderAccessService } from './folders/folder-access.service';

const mockGuard: CanActivate = { canActivate: jest.fn().mockReturnValue(true) };

describe('FilesController RBAC', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let permissionsService: { getPermissionKeysForUser: jest.Mock };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthenticatedUser;

  const buildContext = (
    handler: (...args: unknown[]) => unknown,
  ) =>
    ({
      getHandler: () => handler,
      getClass: () => FilesController,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as Parameters<PermissionsGuard['canActivate']>[0];

  beforeEach(async () => {
    permissionsService = {
      getPermissionKeysForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        Reflector,
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    guard = module.get(PermissionsGuard);
    reflector = module.get(Reflector);
  });

  it('allows owner with file.delete to delete files', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.FILE_DELETE]),
    );

    const handler = FilesController.prototype.deleteFile;
    const required = reflector.get<typeof PERMISSIONS.FILE_DELETE[]>(
      PERMISSIONS_METADATA_KEY,
      handler,
    );

    expect(required).toEqual([PERMISSIONS.FILE_DELETE]);

    await expect(guard.canActivate(buildContext(handler))).resolves.toBe(true);
  });

  it('denies agent without file.delete', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.FILE_UPLOAD, PERMISSIONS.FILE_READ]),
    );

    const handler = FilesController.prototype.deleteFile;

    await expect(guard.canActivate(buildContext(handler))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('requires file.upload for request-upload', async () => {
    const handler = FilesController.prototype.requestUpload;
    const required = reflector.get(PERMISSIONS_METADATA_KEY, handler);

    expect(required).toEqual([PERMISSIONS.FILE_UPLOAD]);
  });
});

describe('FilesController', () => {
  let controller: FilesController;
  let filesService: {
    requestUpload: jest.Mock;
    deleteFile: jest.Mock;
    getFileFolderId: jest.Mock;
    getDownloadUrl: jest.Mock;
    listFiles: jest.Mock;
  };
  let folderAccess: {
    snapshot: jest.Mock;
    assertAccessible: jest.Mock;
    assertFolderAccessible: jest.Mock;
  };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthenticatedUser;

  beforeEach(async () => {
    filesService = {
      requestUpload: jest.fn().mockResolvedValue({ uploadUrl: 'https://s3' }),
      deleteFile: jest.fn().mockResolvedValue({ id: 'file-1' }),
      getFileFolderId: jest.fn().mockResolvedValue(null),
      getDownloadUrl: jest.fn().mockResolvedValue({ downloadUrl: 'u' }),
      listFiles: jest.fn().mockResolvedValue({ items: [] }),
    };
    folderAccess = {
      snapshot: jest.fn().mockResolvedValue({
        folders: new Map(),
        lockedIds: new Set(['locked-folder']),
        lockRootOf: new Map(),
      }),
      assertAccessible: jest.fn(),
      assertFolderAccessible: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: filesService },
        { provide: FolderAccessService, useValue: folderAccess },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(FilesController);
  });

  it('delegates delete to service when invoked', async () => {
    await expect(controller.deleteFile(user, 'file-1')).resolves.toEqual({
      success: true,
      data: { id: 'file-1' },
    });

    expect(filesService.deleteFile).toHaveBeenCalledWith(
      'file-1',
      'tenant-1',
      'user-1',
    );
  });

  it('refuses to delete a file inside a locked folder', async () => {
    filesService.getFileFolderId.mockResolvedValue('locked-folder');
    folderAccess.assertFolderAccessible.mockRejectedValue(
      new ForbiddenException('locked'),
    );

    await expect(controller.deleteFile(user, 'file-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(filesService.deleteFile).not.toHaveBeenCalled();
  });

  it('refuses a download URL for a file inside a locked folder', async () => {
    filesService.getFileFolderId.mockResolvedValue('locked-folder');
    folderAccess.assertFolderAccessible.mockRejectedValue(
      new ForbiddenException('locked'),
    );

    await expect(controller.getDownloadUrl(user, 'file-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(filesService.getDownloadUrl).not.toHaveBeenCalled();
  });

  it('hides files in locked folders from listings', async () => {
    await controller.listFiles(user, {});

    expect(filesService.listFiles).toHaveBeenCalledWith(
      'tenant-1',
      {},
      { lockedFolderIds: ['locked-folder'] },
    );
  });
});
