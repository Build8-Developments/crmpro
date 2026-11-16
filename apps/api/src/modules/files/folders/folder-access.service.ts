import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { CacheService } from '../../../common/cache/cache.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordService } from '../../../common/security/password.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import {
  FOLDER_AUDIT_ACTIONS,
  FOLDER_UNLOCK_MAX_ATTEMPTS,
  FOLDER_UNLOCK_TTL_SECONDS,
  FOLDER_UNLOCK_WINDOW_SECONDS,
} from './folders.constants';

export interface FolderNode {
  id: string;
  parentId: string | null;
  name: string;
  hasPassword: boolean;
  createdByUserId: string;
  createdByName: string;
  createdAt: Date;
}

/** Folder tree for a tenant plus this session's lock state. */
export interface FolderAccessSnapshot {
  folders: Map<string, FolderNode>;
  /** Folders the session cannot open (own lock or a locked ancestor). */
  lockedIds: Set<string>;
  /** For each locked folder, the ancestor-or-self that holds the password. */
  lockRootOf: Map<string, string>;
}

/**
 * Decides whether the current session may see inside a folder.
 *
 * A folder with a password locks itself and every descendant. Unlocking is
 * per session (not per user) and expires, so a stolen laptop with an old
 * session does not keep private folders open forever, and signing out of a
 * device re-locks everything on it.
 */
@Injectable()
export class FolderAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly passwords: PasswordService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async snapshot(user: AuthenticatedUser): Promise<FolderAccessSnapshot> {
    const rows = await this.prisma.fileFolder.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      select: {
        id: true,
        parentId: true,
        name: true,
        passwordHash: true,
        createdByUserId: true,
        createdBy: { select: { name: true } },
        createdAt: true,
      },
    });

    const folders = new Map<string, FolderNode>(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          parentId: row.parentId,
          name: row.name,
          hasPassword: row.passwordHash !== null,
          createdByUserId: row.createdByUserId,
          createdByName: row.createdBy?.name ?? 'Former user',
          createdAt: row.createdAt,
        },
      ]),
    );

    const unlocked = new Set<string>();
    await Promise.all(
      rows
        .filter((row) => row.passwordHash !== null)
        .map(async (row) => {
          const stored = await this.cache.get<string>(
            this.unlockKey(user, row.id),
          );
          // Changing or removing the password invalidates earlier unlocks.
          if (stored && stored === fingerprint(row.passwordHash!)) {
            unlocked.add(row.id);
          }
        }),
    );

    const lockedIds = new Set<string>();
    const lockRootOf = new Map<string, string>();
    for (const folder of folders.values()) {
      // Walk up; the nearest protected ancestor that is still locked wins.
      let current: FolderNode | undefined = folder;
      const seen = new Set<string>();
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        if (current.hasPassword && !unlocked.has(current.id)) {
          lockedIds.add(folder.id);
          lockRootOf.set(folder.id, current.id);
          break;
        }
        current = current.parentId ? folders.get(current.parentId) : undefined;
      }
    }

    return { folders, lockedIds, lockRootOf };
  }

  /** Throws NOT_FOUND for unknown folders and FOLDER_LOCKED for locked ones. */
  assertAccessible(snapshot: FolderAccessSnapshot, folderId: string): FolderNode {
    const folder = snapshot.folders.get(folderId);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    if (snapshot.lockedIds.has(folderId)) {
      throw new ForbiddenException({
        code: API_ERROR_CODES.FOLDER_LOCKED,
        message: 'This folder is password-protected. Unlock it to continue.',
        details: { folderId: snapshot.lockRootOf.get(folderId) ?? folderId },
      });
    }
    return folder;
  }

  async assertFolderAccessible(
    user: AuthenticatedUser,
    folderId: string,
  ): Promise<FolderNode> {
    return this.assertAccessible(await this.snapshot(user), folderId);
  }

  /** Unlocks a password-protected folder for this session. */
  async unlock(
    user: AuthenticatedUser,
    folderId: string,
    password: string,
  ): Promise<{ unlockedForSeconds: number }> {
    const folder = await this.prisma.fileFolder.findFirst({
      where: { id: folderId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, name: true, passwordHash: true },
    });
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    if (!folder.passwordHash) {
      return { unlockedForSeconds: 0 };
    }

    const attemptsKey = `files:unlock-attempts:${user.tenantId}:${user.id}:${folderId}`;
    const attempts = await this.cache.incrementWithTtl(
      attemptsKey,
      FOLDER_UNLOCK_WINDOW_SECONDS,
    );
    if (attempts > FOLDER_UNLOCK_MAX_ATTEMPTS) {
      throw new HttpException(
        {
          code: API_ERROR_CODES.RATE_LIMITED,
          message: 'Too many wrong passwords. Try again in 15 minutes.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await this.passwords.verify(folder.passwordHash, password);
    await this.auditWriter.createAuditLog({
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: valid
        ? FOLDER_AUDIT_ACTIONS.UNLOCKED
        : FOLDER_AUDIT_ACTIONS.UNLOCK_FAILED,
      entityType: 'FileFolder',
      entityId: folder.id,
      metadata: { name: folder.name },
    });

    if (!valid) {
      throw new ForbiddenException({
        code: API_ERROR_CODES.FORBIDDEN,
        message: 'Wrong folder password',
      });
    }

    await this.cache.delete(attemptsKey);
    await this.cache.set(
      this.unlockKey(user, folderId),
      fingerprint(folder.passwordHash),
      FOLDER_UNLOCK_TTL_SECONDS,
    );
    return { unlockedForSeconds: FOLDER_UNLOCK_TTL_SECONDS };
  }

  /** Re-locks a folder for this session immediately. */
  async lock(user: AuthenticatedUser, folderId: string): Promise<void> {
    await this.cache.delete(this.unlockKey(user, folderId));
  }

  private unlockKey(user: AuthenticatedUser, folderId: string): string {
    return `files:unlock:${user.tenantId}:${user.sessionId}:${folderId}`;
  }
}

/** Short, non-reversible tag of the current password hash. */
function fingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
}
