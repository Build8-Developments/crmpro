import { NotFoundException } from '@nestjs/common';
import { ExportFormat, JobStatus } from '@crmpro/database';
import { ExportJobsService } from './export-jobs.service';

describe('ExportJobsService lead scoping', () => {
  const agentScope = { kind: 'own', actorUserId: 'agent-1' } as const;

  let prisma: {
    exportJob: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: ExportJobsService;

  beforeEach(() => {
    prisma = {
      exportJob: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'job-1', status: JobStatus.PENDING }),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };

    service = new ExportJobsService(
      prisma as never,
      {} as never, // files
      { assertSupportedFormat: jest.fn() } as never,
      {} as never, // csv
      {} as never, // xlsx
      { enqueueExportJob: jest.fn() } as never,
      { publish: jest.fn() } as never,
      {} as never, // notifications
      {} as never, // tenant status
      { createAuditLog: jest.fn() } as never,
    );
  });

  it('freezes the requester scope onto the job for the worker', async () => {
    prisma.exportJob.findFirst.mockResolvedValue(null);

    await service.createLeadExportJob(
      'tenant-1',
      'agent-1',
      { format: ExportFormat.CSV },
      agentScope,
    );

    expect(prisma.exportJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          filters: expect.objectContaining({
            scope: { kind: 'own', actorUserId: 'agent-1' },
          }) as Record<string, unknown>,
        }) as Record<string, unknown>,
      }),
    );
  });

  it("only lists a scoped user's own export jobs", async () => {
    await service.listExportJobs('tenant-1', {}, agentScope);

    expect(prisma.exportJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          createdByUserId: 'agent-1',
        }) as Record<string, unknown>,
      }),
    );
  });

  it("hides other users' export jobs behind 404", async () => {
    prisma.exportJob.findFirst.mockResolvedValue(null);

    await expect(
      service.getExportJob('job-of-manager', 'tenant-1', agentScope),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.exportJob.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'job-of-manager',
          tenantId: 'tenant-1',
          createdByUserId: 'agent-1',
        },
      }),
    );
  });
});
