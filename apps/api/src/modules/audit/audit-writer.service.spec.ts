import { Test, TestingModule } from '@nestjs/testing';
import { AuditActorType } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AUDIT_ENTITY_TYPES } from './audit.constants';
import { AuditWriterService } from './audit-writer.service';
import { USER_AUDIT_ACTIONS } from '../users/users.constants';

describe('AuditWriterService', () => {
  let service: AuditWriterService;
  let prisma: { auditLog: { create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditWriterService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AuditWriterService);
  });

  it('writes immutable USER_CREATED audit rows', async () => {
    await service.createAuditLog({
      tenantId: 'tenant-1',
      actorUserId: 'actor-1',
      action: USER_AUDIT_ACTIONS.CREATED,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: 'user-1',
      metadata: { email: 'jane@example.com' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        actorType: AuditActorType.USER,
        actorUserId: 'actor-1',
        action: USER_AUDIT_ACTIONS.CREATED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: 'user-1',
        metadata: { email: 'jane@example.com' },
      },
    });
  });
});
