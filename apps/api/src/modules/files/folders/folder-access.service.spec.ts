import { ForbiddenException, HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { CacheService } from '../../../common/cache/cache.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordService } from '../../../common/security/password.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { FolderAccessService } from './folder-access.service';

const fp = (hash: string) =>
  createHash('sha256').update(hash).digest('hex').slice(0, 16);

describe('FolderAccessService', () => {
  let service: FolderAccessService;
  let prisma: {
    fileFolder: { findMany: jest.Mock; findFirst: jest.Mock };
  };
  let cacheStore: Map<string, unknown>;
  let cache: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    incrementWithTtl: jest.Mock;
  };
  let passwords: { verify: jest.Mock };
  let audit: { createAuditLog: jest.Mock };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    sessionId: 'session-1',
  };

  // root ─┬─ open
  //       └─ vault (password "h1") ── inner ── deeper
  const folders = [
    { id: 'open', parentId: null, name: 'Open', passwordHash: null },
    { id: 'vault', parentId: null, name: 'Vault', passwordHash: 'h1' },
    { id: 'inner', parentId: 'vault', name: 'Inner', passwordHash: null },
    { id: 'deeper', parentId: 'inner', name: 'Deeper', passwordHash: null },
  ].map((f) => ({
    ...f,
    createdByUserId: 'user-2',
    createdBy: { name: 'Sara' },
    createdAt: new Date(),
  }));

  beforeEach(async () => {
    cacheStore = new Map();
    cache = {
      get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: unknown) => {
        cacheStore.set(key, value);
      }),
      delete: jest.fn(async (key: string) => {
        cacheStore.delete(key);
      }),
      incrementWithTtl: jest.fn(async (key: string) => {
        const next = ((cacheStore.get(key) as number) ?? 0) + 1;
        cacheStore.set(key, next);
        return next;
      }),
    };
    prisma = {
      fileFolder: {
        findMany: jest.fn().mockResolvedValue(folders),
        findFirst: jest.fn(async ({ where }) =>
          folders.find((f) => f.id === where.id) ?? null,
        ),
      },
    };
    passwords = {
      verify: jest.fn(async (hash: string, plain: string) =>
        hash === 'h1' && plain === 'right',
      ),
    };
    audit = { createAuditLog: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FolderAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: PasswordService, useValue: passwords },
        { provide: AuditWriterService, useValue: audit },
      ],
    }).compile();

    service = module.get(FolderAccessService);
  });

  it('locks a private folder and every descendant, not its siblings', async () => {
    const snapshot = await service.snapshot(user);

    expect([...snapshot.lockedIds].sort()).toEqual(['deeper', 'inner', 'vault']);
    expect(snapshot.lockRootOf.get('deeper')).toBe('vault');
  });

  it('reports the lock root in a FOLDER_LOCKED error', async () => {
    const snapshot = await service.snapshot(user);

    try {
      service.assertAccessible(snapshot, 'deeper');
      fail('expected FOLDER_LOCKED');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'FOLDER_LOCKED',
        details: { folderId: 'vault' },
      });
    }
  });

  it('unlocks the whole subtree for this session only', async () => {
    await service.unlock(user, 'vault', 'right');

    expect((await service.snapshot(user)).lockedIds.size).toBe(0);
    const otherSession = { ...user, sessionId: 'session-2' };
    expect((await service.snapshot(otherSession)).lockedIds.has('vault')).toBe(
      true,
    );
  });

  it('re-locks when the folder password changes after unlocking', async () => {
    cacheStore.set('files:unlock:tenant-1:session-1:vault', fp('h1'));
    prisma.fileFolder.findMany.mockResolvedValue(
      folders.map((f) => (f.id === 'vault' ? { ...f, passwordHash: 'h2' } : f)),
    );

    expect((await service.snapshot(user)).lockedIds.has('vault')).toBe(true);
  });

  it('rejects a wrong password and audits the failure', async () => {
    await expect(service.unlock(user, 'vault', 'wrong')).rejects.toThrow(
      'Wrong folder password',
    );
    expect(audit.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FOLDER_UNLOCK_FAILED' }),
    );
  });

  it('rate-limits repeated wrong passwords', async () => {
    for (let i = 0; i < 5; i += 1) {
      await expect(service.unlock(user, 'vault', 'wrong')).rejects.toThrow(
        'Wrong folder password',
      );
    }

    const blocked = service.unlock(user, 'vault', 'right');
    await expect(blocked).rejects.toBeInstanceOf(HttpException);
    await expect(blocked).rejects.toMatchObject({ status: 429 });
  });

  it('lock() closes an unlocked folder again', async () => {
    await service.unlock(user, 'vault', 'right');
    await service.lock(user, 'vault');

    expect((await service.snapshot(user)).lockedIds.has('vault')).toBe(true);
  });
});
