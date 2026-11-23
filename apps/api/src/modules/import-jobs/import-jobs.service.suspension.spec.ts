import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { TenantInactiveException } from '../../common/tenant-access/tenant-access.exception';
import { StorageService } from '../../common/storage/storage.service';
import { LeadsService } from '../leads/leads.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QueueService } from '../jobs/queues/queue.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { ImportJobsService } from './import-jobs.service';

describe('ImportJobsService tenant suspension', () => {
  let service: ImportJobsService;
  let tenantAccessService: {
    assertTenantAccessible: jest.Mock;
    getTenantAccessState: jest.Mock;
  };
  let prisma: {
    importJob: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    tenantAccessService = {
      assertTenantAccessible: jest.fn(),
      getTenantAccessState: jest
        .fn()
        .mockResolvedValue({ readOnly: false, accessEndsAt: null }),
    };

    prisma = {
      importJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-1',
          status: JobStatus.PENDING,
          tenantId: 'tenant-1',
          createdByUserId: 'user-1',
          fileAssetId: 'file-1',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportJobsService,
        {
          provide: CustomFieldsService,
          useValue: { getLeadDefinitions: jest.fn().mockResolvedValue([]) },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: {} },
        { provide: LeadsService, useValue: {} },
        { provide: QueueService, useValue: {} },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        { provide: NotificationTriggerService, useValue: {} },
        { provide: TenantAccessService, useValue: tenantAccessService },
        {
          provide: AuditWriterService,
          useValue: { createAuditLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ImportJobsService);
  });

  it('fails import job when tenant is inactive without throwing', async () => {
    tenantAccessService.assertTenantAccessible.mockRejectedValue(
      new TenantInactiveException(),
    );

    await expect(service.processImportJob('job-1')).resolves.toBeUndefined();

    expect(prisma.importJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'job-1' }),
        data: expect.objectContaining({
          status: JobStatus.FAILED,
          errorSummary: [{ row: 0, reason: 'Tenant is inactive.' }],
        }),
      }),
    );
  });

  it('fails a queued import when the workspace went read-only', async () => {
    tenantAccessService.getTenantAccessState.mockResolvedValue({
      readOnly: true,
      accessEndsAt: new Date('2027-01-12T00:00:00Z'),
    });

    await expect(service.processImportJob('job-1')).resolves.toBeUndefined();

    expect(prisma.importJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'job-1' }),
        data: expect.objectContaining({ status: JobStatus.FAILED }),
      }),
    );
  });

  it('propagates non-tenant errors so BullMQ can retry', async () => {
    tenantAccessService.assertTenantAccessible.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(service.processImportJob('job-1')).rejects.toThrow(
      'connection lost',
    );
  });
});
