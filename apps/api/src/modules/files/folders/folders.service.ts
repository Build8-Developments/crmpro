import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FileAssetCategory, Prisma } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsService } from '../../../common/auth/services/permissions.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordService } from '../../../common/security/password.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { CreateFolderDto } from './dto/create-folder.dto';
import { MoveFilesDto } from './dto/move-files.dto';
import { SetFolderPasswordDto } from './dto/set-folder-password.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import {
  FolderAccessService,
  type FolderAccessSnapshot,
  type FolderNode,
} from './folder-access.service';
import { FOLDER_AUDIT_ACTIONS, FOLDER_MAX_DEPTH } from './folders.constants';

export interface FolderResponse {
  id: string;
  parentId: string | null;
  name: string;
  isPrivate: boolean;
  /** Private (or inside a private folder) and not unlocked by this session. */
  isLocked: boolean;
  /** Files directly inside; null while locked. */
  fileCount: number | null;
  createdAt: Date;
  createdBy: { id: string; fullName: string };
  /** Whether the current user may rename/move/delete/protect it. */
  canManage: boolean;
}

/** Only user-uploaded files live in gallery folders. */
const FOLDERABLE_CATEGORIES: FileAssetCategory[] = [FileAssetCategory.OTHER];

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: FolderAccessService,
    private readonly passwords: PasswordService,
    private readonly permissions: PermissionsService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async listFolders(user: AuthenticatedUser): Promise<FolderResponse[]> {
    const snapshot = await this.access.snapshot(user);
    const canManageAll = await this.canManageAll(user);

    const counts = await this.prisma.fileAsset.groupBy({
      by: ['folderId'],
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        folderId: { not: null },
      },
      _count: { _all: true },
    });
    const countByFolder = new Map(
      counts.map((row) => [row.folderId, row._count._all]),
    );

    return [...snapshot.folders.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((folder) => {
        const isLocked = snapshot.lockedIds.has(folder.id);
        return {
          id: folder.id,
          parentId: folder.parentId,
          // Private folder names stay visible (like a locked door), contents don't.
          name: folder.name,
          isPrivate: folder.hasPassword,
          isLocked,
          fileCount: isLocked ? null : (countByFolder.get(folder.id) ?? 0),
          createdAt: folder.createdAt,
          createdBy: {
            id: folder.createdByUserId,
            fullName: folder.createdByName,
          },
          canManage: canManageAll || folder.createdByUserId === user.id,
        };
      });
  }

  async createFolder(
    user: AuthenticatedUser,
    dto: CreateFolderDto,
  ): Promise<FolderResponse> {
    const snapshot = await this.access.snapshot(user);
    if (dto.parentId) {
      this.access.assertAccessible(snapshot, dto.parentId);
      if (this.depthOf(snapshot, dto.parentId) + 1 >= FOLDER_MAX_DEPTH) {
        throw new BadRequestException(
          `Folders can be nested at most ${FOLDER_MAX_DEPTH} levels deep`,
        );
      }
    }
    this.assertNameFree(snapshot, dto.parentId ?? null, dto.name);

    const passwordHash = dto.password
      ? await this.passwords.hash(dto.password)
      : null;

    const folder = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fileFolder.create({
        data: {
          tenantId: user.tenantId,
          parentId: dto.parentId ?? null,
          name: dto.name,
          passwordHash,
          createdByUserId: user.id,
        },
      });
      await this.auditWriter.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: FOLDER_AUDIT_ACTIONS.CREATED,
        entityType: 'FileFolder',
        entityId: created.id,
        metadata: {
          name: created.name,
          parentId: created.parentId,
          isPrivate: passwordHash !== null,
        },
        tx,
      });
      return created;
    });

    // The creator just chose the password; don't make them type it again.
    if (dto.password) {
      await this.access.unlock(user, folder.id, dto.password);
    }

    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.name,
      isPrivate: passwordHash !== null,
      isLocked: false,
      fileCount: 0,
      createdAt: folder.createdAt,
      createdBy: { id: user.id, fullName: '' },
      canManage: true,
    };
  }

  async updateFolder(
    user: AuthenticatedUser,
    folderId: string,
    dto: UpdateFolderDto,
  ): Promise<{ id: string }> {
    const snapshot = await this.access.snapshot(user);
    const folder = this.access.assertAccessible(snapshot, folderId);
    await this.assertCanManage(user, folder);

    const data: Prisma.FileFolderUpdateInput = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    const nextParentId =
      dto.parentId === undefined ? folder.parentId : dto.parentId;

    if (dto.parentId !== undefined && dto.parentId !== folder.parentId) {
      if (dto.parentId) {
        this.access.assertAccessible(snapshot, dto.parentId);
        if (this.isSelfOrDescendant(snapshot, dto.parentId, folder.id)) {
          throw new BadRequestException(
            "A folder can't be moved into itself or one of its subfolders",
          );
        }
        const newDepth =
          this.depthOf(snapshot, dto.parentId) +
          1 +
          this.subtreeHeight(snapshot, folder.id);
        if (newDepth > FOLDER_MAX_DEPTH) {
          throw new BadRequestException(
            `Folders can be nested at most ${FOLDER_MAX_DEPTH} levels deep`,
          );
        }
      }
      data.parent = dto.parentId
        ? { connect: { id: dto.parentId } }
        : { disconnect: true };
      changes.parentId = { from: folder.parentId, to: dto.parentId };
    }

    const nextName = dto.name ?? folder.name;
    if (
      dto.name !== undefined ||
      (dto.parentId !== undefined && dto.parentId !== folder.parentId)
    ) {
      this.assertNameFree(snapshot, nextParentId, nextName, folder.id);
    }
    if (dto.name !== undefined && dto.name !== folder.name) {
      data.name = dto.name;
      changes.name = { from: folder.name, to: dto.name };
    }

    if (Object.keys(changes).length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.fileFolder.update({ where: { id: folder.id }, data });
        await this.auditWriter.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: FOLDER_AUDIT_ACTIONS.UPDATED,
          entityType: 'FileFolder',
          entityId: folder.id,
          metadata: { changes },
          tx,
        });
      });
    }

    return { id: folder.id };
  }

  /** Deletes an empty folder. Non-empty folders must be emptied first. */
  async deleteFolder(
    user: AuthenticatedUser,
    folderId: string,
  ): Promise<{ id: string }> {
    const snapshot = await this.access.snapshot(user);
    const folder = this.access.assertAccessible(snapshot, folderId);
    await this.assertCanManage(user, folder);

    const hasChildren = [...snapshot.folders.values()].some(
      (candidate) => candidate.parentId === folder.id,
    );
    const fileCount = await this.prisma.fileAsset.count({
      where: { folderId: folder.id, deletedAt: null },
    });
    if (hasChildren || fileCount > 0) {
      throw new ConflictException(
        'Only empty folders can be deleted. Move or delete what is inside first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.fileFolder.update({
        where: { id: folder.id },
        data: { deletedAt: new Date() },
      });
      await this.auditWriter.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: FOLDER_AUDIT_ACTIONS.DELETED,
        entityType: 'FileFolder',
        entityId: folder.id,
        metadata: { name: folder.name },
        tx,
      });
    });

    return { id: folder.id };
  }

  /**
   * Sets, changes or removes a folder password.
   *
   * - Adding a password to an open folder: its manager.
   * - Changing/removing an existing one: its manager with the current password,
   *   or anyone with `file.manage` without it (forgotten-password reset).
   */
  async setPassword(
    user: AuthenticatedUser,
    folderId: string,
    dto: SetFolderPasswordDto,
  ): Promise<{ id: string; isPrivate: boolean }> {
    const folder = await this.prisma.fileFolder.findFirst({
      where: { id: folderId, tenantId: user.tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        parentId: true,
        passwordHash: true,
        createdByUserId: true,
      },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const canManageAll = await this.canManageAll(user);
    if (!canManageAll && folder.createdByUserId !== user.id) {
      throw new ForbiddenException(
        'Only the folder owner or a files manager can change its password',
      );
    }

    // A parent lock still applies; you can't re-key a folder you can't open
    // through an ancestor.
    const snapshot = await this.access.snapshot(user);
    if (folder.parentId) {
      this.access.assertAccessible(snapshot, folder.parentId);
    }

    let isReset = false;
    if (folder.passwordHash) {
      if (dto.currentPassword) {
        const valid = await this.passwords.verify(
          folder.passwordHash,
          dto.currentPassword,
        );
        if (!valid) {
          throw new BadRequestException('Current folder password is incorrect');
        }
      } else if (canManageAll) {
        isReset = true;
      } else {
        throw new BadRequestException('Enter the current folder password');
      }
    }

    const passwordHash =
      dto.newPassword === null
        ? null
        : await this.passwords.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.fileFolder.update({
        where: { id: folder.id },
        data: { passwordHash },
      });
      await this.auditWriter.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action:
          passwordHash === null
            ? FOLDER_AUDIT_ACTIONS.PASSWORD_REMOVED
            : isReset
              ? FOLDER_AUDIT_ACTIONS.PASSWORD_RESET
              : FOLDER_AUDIT_ACTIONS.PASSWORD_SET,
        entityType: 'FileFolder',
        entityId: folder.id,
        metadata: { name: folder.name },
        tx,
      });
    });

    if (dto.newPassword) {
      await this.access.unlock(user, folder.id, dto.newPassword);
    }

    return { id: folder.id, isPrivate: passwordHash !== null };
  }

  /** Moves gallery files between folders (null = root). */
  async moveFiles(
    user: AuthenticatedUser,
    dto: MoveFilesDto,
  ): Promise<{ moved: number }> {
    const snapshot = await this.access.snapshot(user);
    if (dto.folderId) {
      this.access.assertAccessible(snapshot, dto.folderId);
    }

    const files = await this.prisma.fileAsset.findMany({
      where: {
        id: { in: dto.fileIds },
        tenantId: user.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        category: true,
        folderId: true,
        uploadedByUserId: true,
      },
    });
    if (files.length !== dto.fileIds.length) {
      throw new NotFoundException('One or more files were not found');
    }

    const canManageAll = await this.canManageAll(user);
    for (const file of files) {
      if (!FOLDERABLE_CATEGORIES.includes(file.category)) {
        throw new BadRequestException(
          'Lead attachments, imports and exports stay in their system folders',
        );
      }
      if (file.folderId) {
        this.access.assertAccessible(snapshot, file.folderId);
      }
      if (!canManageAll && file.uploadedByUserId !== user.id) {
        throw new ForbiddenException('You can only move files you uploaded');
      }
    }

    const moved = await this.prisma.$transaction(async (tx) => {
      const result = await tx.fileAsset.updateMany({
        where: { id: { in: dto.fileIds }, tenantId: user.tenantId },
        data: { folderId: dto.folderId },
      });
      await this.auditWriter.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: FOLDER_AUDIT_ACTIONS.FILES_MOVED,
        entityType: 'FileFolder',
        entityId: dto.folderId,
        metadata: { fileIds: dto.fileIds, toFolderId: dto.folderId },
        tx,
      });
      return result.count;
    });

    return { moved };
  }

  private async canManageAll(user: AuthenticatedUser): Promise<boolean> {
    const granted = await this.permissions.getPermissionKeysForUser(
      user.id,
      user.tenantId,
    );
    return granted.has(PERMISSIONS.FILE_MANAGE);
  }

  private async assertCanManage(
    user: AuthenticatedUser,
    folder: FolderNode,
  ): Promise<void> {
    if (folder.createdByUserId === user.id) return;
    if (await this.canManageAll(user)) return;
    throw new ForbiddenException(
      'Only the folder owner or a files manager can change this folder',
    );
  }

  private assertNameFree(
    snapshot: FolderAccessSnapshot,
    parentId: string | null,
    name: string,
    exceptId?: string,
  ): void {
    const lower = name.toLocaleLowerCase();
    const clash = [...snapshot.folders.values()].some(
      (folder) =>
        folder.id !== exceptId &&
        folder.parentId === parentId &&
        folder.name.toLocaleLowerCase() === lower,
    );
    if (clash) {
      throw new ConflictException(
        'A folder with this name already exists here',
      );
    }
  }

  private depthOf(snapshot: FolderAccessSnapshot, folderId: string): number {
    let depth = 0;
    let current = snapshot.folders.get(folderId);
    while (current?.parentId && depth <= FOLDER_MAX_DEPTH) {
      depth += 1;
      current = snapshot.folders.get(current.parentId);
    }
    return depth;
  }

  private subtreeHeight(
    snapshot: FolderAccessSnapshot,
    folderId: string,
  ): number {
    const children = [...snapshot.folders.values()].filter(
      (folder) => folder.parentId === folderId,
    );
    if (children.length === 0) return 0;
    return (
      1 + Math.max(...children.map((c) => this.subtreeHeight(snapshot, c.id)))
    );
  }

  private isSelfOrDescendant(
    snapshot: FolderAccessSnapshot,
    candidateId: string,
    ancestorId: string,
  ): boolean {
    let current = snapshot.folders.get(candidateId);
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      if (current.id === ancestorId) return true;
      seen.add(current.id);
      current = current.parentId
        ? snapshot.folders.get(current.parentId)
        : undefined;
    }
    return false;
  }
}
