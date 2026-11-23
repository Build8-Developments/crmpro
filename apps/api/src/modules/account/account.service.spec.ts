import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from '../../common/security/password.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { AccountService } from './account.service';

describe('AccountService', () => {
  let service: AccountService;
  let tx: {
    user: { update: jest.Mock };
    userSession: { updateMany: jest.Mock };
  };
  let prisma: {
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let passwords: { verify: jest.Mock; hash: jest.Mock };
  let audit: { createAuditLog: jest.Mock };

  const authUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    sessionId: 'session-current',
  };

  beforeEach(async () => {
    tx = {
      user: { update: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      userSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    };
    prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ passwordHash: 'h' }) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    passwords = {
      verify: jest.fn().mockResolvedValue(true),
      hash: jest.fn().mockResolvedValue('new-hash'),
    };
    audit = { createAuditLog: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwords },
        { provide: AuditWriterService, useValue: audit },
      ],
    }).compile();

    service = module.get(AccountService);
  });

  describe('updateMe', () => {
    it('updates only the signed-in user, scoped to their tenant, and audits', async () => {
      await service.updateMe(authUser, { name: 'Sara Ali', phone: null });

      expect(tx.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1', tenantId: 'tenant-1' },
          data: { name: 'Sara Ali', phone: null },
        }),
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ACCOUNT_PROFILE_UPDATED',
          metadata: { fields: ['name', 'phone'] },
        }),
      );
    });

    it('rejects an empty update', async () => {
      await expect(service.updateMe(authUser, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('changePassword', () => {
    const dto = { currentPassword: 'OldPass123', newPassword: 'NewPass456' };

    it('rejects a wrong current password', async () => {
      passwords.verify.mockResolvedValue(false);

      await expect(service.changePassword(authUser, dto)).rejects.toThrow(
        'Current password is incorrect',
      );
      expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      await expect(
        service.changePassword(authUser, {
          currentPassword: 'Same1234',
          newPassword: 'Same1234',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores the new hash and signs out every other session', async () => {
      await expect(service.changePassword(authUser, dto)).resolves.toEqual({
        revokedSessions: 2,
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hash' },
      });
      expect(tx.userSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          id: { not: 'session-current' },
        },
        data: { revokedAt: expect.any(Date) },
      });
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACCOUNT_PASSWORD_CHANGED' }),
      );
    });
  });
});
