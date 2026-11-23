import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ImportDuplicatePolicy, JobStatus } from '@crmpro/database';
import * as ExcelJS from 'exceljs';
import type { LeadScope } from '../../common/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { StorageService } from '../../common/storage/storage.service';
import { LeadsService } from '../leads/leads.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QueueService } from '../jobs/queues/queue.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { ImportJobsService } from './import-jobs.service';
import type { StoredImportJobOptions } from './types/import-job.types';

const MANAGER: LeadScope = { kind: 'all', actorUserId: 'user-1' };
const AGENT: LeadScope = { kind: 'own', actorUserId: 'user-1' };

const CSV = [
  'الاسم,رقم الموبايل,موبايل ٢,المصدر,المشروع,الميزانية,طريقة الدفع,ملاحظات,Agent',
  'أحمد علي,1012345678,,Facebook,"Mivida ، Zed",2-3M,تقسيط,Call after 5,sara@agency.com',
  'Mona,٠١٠٩٨٧٦٥٤٣٢,010-1111-2222,Unknown source,Unknown project,٣ مليون,,,',
].join('\n');

const MAPPING = {
  الاسم: 'fullName',
  'رقم الموبايل': 'primaryPhone',
  'موبايل ٢': 'secondaryPhone',
  المصدر: 'source',
  المشروع: 'project',
  الميزانية: 'budget',
  'طريقة الدفع': 'paymentPreference',
  ملاحظات: 'notes',
  Agent: 'assignee',
} as const;

function storedOptions(
  overrides: Partial<StoredImportJobOptions> = {},
): StoredImportJobOptions {
  return {
    version: 1,
    mapping: { ...MAPPING },
    defaults: {},
    canAssign: true,
    scope: { kind: 'all' },
    ...overrides,
  };
}

describe('ImportJobsService rows', () => {
  let service: ImportJobsService;
  let storage: { getObject: jest.Mock };
  let leads: {
    createSystemLead: jest.Mock;
    getDefaultPipelinePlacement: jest.Mock;
  };
  let queue: { enqueueImportJob: jest.Mock };
  let prisma: Record<string, Record<string, jest.Mock>>;

  const job = (
    options: StoredImportJobOptions | null,
    duplicatePolicy: ImportDuplicatePolicy = ImportDuplicatePolicy.SKIP,
  ) => {
    prisma.importJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: JobStatus.PENDING,
      tenantId: 'tenant-1',
      createdByUserId: 'user-1',
      fileAssetId: 'file-1',
      duplicatePolicy,
      options,
    });
  };

  const finalUpdate = () => {
    const calls = prisma.importJob.update.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    return calls[calls.length - 1][0].data;
  };

  beforeEach(async () => {
    storage = { getObject: jest.fn().mockResolvedValue(Buffer.from(CSV)) };
    leads = {
      createSystemLead: jest
        .fn()
        .mockResolvedValue({ status: 'created', leadId: 'lead-1' }),
      getDefaultPipelinePlacement: jest.fn().mockResolvedValue({
        pipelineId: 'default-pipeline',
        pipelineStageId: 'default-stage',
      }),
    };
    queue = { enqueueImportJob: jest.fn() };
    prisma = {
      importJob: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
        create: jest
          .fn()
          .mockImplementation(
            ({ data }: { data: Record<string, unknown> }) => ({
              id: 'job-1',
              status: JobStatus.PENDING,
              totalRows: 0,
              processedRows: 0,
              successfulRows: 0,
              failedRows: 0,
              skippedRows: 0,
              errorSummary: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              completedAt: null,
              fileAsset: { id: 'file-1', originalFilename: 'leads.csv' },
              createdBy: { id: 'user-1', name: 'Manager', email: 'm@x.com' },
              ...data,
            }),
          ),
      },
      fileAsset: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'file-1',
          category: 'IMPORT_FILE',
          objectKey: 'imports/leads.csv',
          mimeType: 'text/csv',
          originalFilename: 'leads.csv',
          sizeBytes: BigInt(1024),
        }),
      },
      leadSource: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'source-fb', name: 'Facebook' }]),
        findFirst: jest.fn().mockResolvedValue({ id: 'source-default' }),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'project-mivida', name: 'Mivida' },
          { id: 'project-zed', name: 'ZED' },
        ]),
        findFirst: jest.fn().mockResolvedValue({ id: 'project-default' }),
      },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'agent-sara', name: 'Sara', email: 'sara@agency.com' },
          ]),
        findFirst: jest.fn().mockResolvedValue({ id: 'agent-sara' }),
      },
      pipelineStage: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stage-2',
          pipelineId: 'pipeline-2',
          isClosed: false,
        }),
      },
      pipeline: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportJobsService,
        {
          provide: CustomFieldsService,
          useValue: { getLeadDefinitions: jest.fn().mockResolvedValue([]) },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: LeadsService, useValue: leads },
        { provide: QueueService, useValue: queue },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: NotificationTriggerService,
          useValue: { notifyImportCompleted: jest.fn() },
        },
        {
          provide: TenantAccessService,
          useValue: {
            assertTenantAccessible: jest.fn().mockResolvedValue(undefined),
            getTenantAccessState: jest
              .fn()
              .mockResolvedValue({ readOnly: false, accessEndsAt: null }),
          },
        },
        {
          provide: AuditWriterService,
          useValue: { createAuditLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ImportJobsService);
  });

  describe('processing', () => {
    it('cleans values, applies defaults and creates every row through createSystemLead', async () => {
      job(
        storedOptions({
          defaults: {
            sourceId: 'source-default',
            projectId: 'project-default',
            pipelineId: 'pipeline-2',
            pipelineStageId: 'stage-2',
          },
        }),
      );

      await service.processImportJob('job-1');

      expect(leads.createSystemLead).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = leads.createSystemLead.mock.calls;

      expect(firstCall).toEqual([
        'tenant-1',
        expect.objectContaining({
          fullName: 'أحمد علي',
          primaryPhone: '01012345678',
          secondaryPhone: null,
          sourceId: 'source-fb',
          assignedUserId: 'agent-sara',
          projectIds: ['project-mivida', 'project-zed', 'project-default'],
          message: 'Call after 5',
          profile: expect.objectContaining({
            budgetMin: 2_000_000,
            budgetMax: 3_000_000,
            paymentPreference: 'INSTALLMENTS',
          }),
        }),
        { pipelineId: 'pipeline-2', pipelineStageId: 'stage-2' },
        {
          origin: 'import',
          actorUserId: 'user-1',
          importJobId: 'job-1',
          importRowNumber: 2,
          duplicatePolicy: ImportDuplicatePolicy.SKIP,
        },
      ]);

      // Unknown source/project names fall back to the defaults.
      expect(secondCall[1]).toEqual(
        expect.objectContaining({
          fullName: 'Mona',
          primaryPhone: '01098765432',
          secondaryPhone: '01011112222',
          sourceId: 'source-default',
          assignedUserId: null,
          projectIds: ['project-default'],
          message: null,
          profile: expect.objectContaining({
            budgetMin: 3_000_000,
            budgetMax: 3_000_000,
          }),
        }),
      );
      expect(secondCall[3]).toEqual(
        expect.objectContaining({ importRowNumber: 3 }),
      );
      expect(leads.getDefaultPipelinePlacement).not.toHaveBeenCalled();
      expect(finalUpdate()).toEqual(
        expect.objectContaining({
          status: JobStatus.COMPLETED,
          totalRows: 2,
          successfulRows: 2,
          failedRows: 0,
          skippedRows: 0,
        }),
      );
    });

    it('SKIP: duplicates count as skipped (not failed) and are listed as such', async () => {
      job(storedOptions());
      leads.createSystemLead
        .mockResolvedValueOnce({
          status: 'duplicate',
          existingLeadId: 'lead-old',
          existingAssigneeId: null,
          existingIsOpen: true,
        })
        .mockResolvedValueOnce({ status: 'failed', reason: 'Invalid email' });

      await service.processImportJob('job-1');

      expect(finalUpdate()).toEqual(
        expect.objectContaining({
          status: JobStatus.FAILED,
          successfulRows: 0,
          failedRows: 1,
          skippedRows: 1,
          processedRows: 2,
          errorSummary: [
            {
              row: 2,
              reason: 'A lead with this phone number already exists',
              kind: 'duplicate',
            },
            { row: 3, reason: 'Invalid email', kind: 'error' },
          ],
        }),
      );
    });

    it('SKIP: a file of only duplicates still completes', async () => {
      job(storedOptions());
      leads.createSystemLead.mockResolvedValue({
        status: 'duplicate',
        existingLeadId: 'lead-old',
        existingAssigneeId: null,
        existingIsOpen: true,
      });

      await service.processImportJob('job-1');

      expect(finalUpdate()).toEqual(
        expect.objectContaining({
          status: JobStatus.COMPLETED,
          skippedRows: 2,
          failedRows: 0,
        }),
      );
    });

    it('CREATE: passes the policy so duplicates are imported anyway', async () => {
      job(storedOptions(), ImportDuplicatePolicy.CREATE);

      await service.processImportJob('job-1');

      expect(leads.createSystemLead.mock.calls[0][3]).toEqual(
        expect.objectContaining({
          duplicatePolicy: ImportDuplicatePolicy.CREATE,
        }),
      );
      expect(finalUpdate()).toEqual(
        expect.objectContaining({ successfulRows: 2, skippedRows: 0 }),
      );
    });

    it('retry: re-claims a PROCESSING job and counts already-created rows as success', async () => {
      job(storedOptions());
      leads.createSystemLead
        .mockResolvedValueOnce({ status: 'already-created', leadId: 'lead-1' })
        .mockResolvedValueOnce({ status: 'created', leadId: 'lead-2' });

      await service.processImportJob('job-1', { isRetry: true });

      expect(prisma.importJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
        },
        data: { status: JobStatus.PROCESSING },
      });
      expect(finalUpdate()).toEqual(
        expect.objectContaining({
          status: JobStatus.COMPLETED,
          successfulRows: 2,
          skippedRows: 0,
        }),
      );
    });

    it('ignores the assignee column and default when the importer lacks lead.assign', async () => {
      job(
        storedOptions({
          canAssign: false,
          defaults: { assignedUserId: 'agent-sara' },
        }),
      );

      await service.processImportJob('job-1');

      for (const call of leads.createSystemLead.mock.calls) {
        expect(call[1]).toEqual(
          expect.objectContaining({ assignedUserId: null }),
        );
      }
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('never assigns outside the importer scope', async () => {
      job(
        storedOptions({
          scope: { kind: 'team', actorUserId: 'user-1', userIds: ['user-1'] },
        }),
      );

      await service.processImportJob('job-1');

      expect(leads.createSystemLead.mock.calls[0][1]).toEqual(
        expect.objectContaining({ assignedUserId: null }),
      );
    });

    it('fails rows without a name or phone before calling the lead service', async () => {
      job(
        storedOptions({
          mapping: { الاسم: 'fullName', 'رقم الموبايل': 'primaryPhone' },
        }),
      );
      storage.getObject.mockResolvedValue(
        Buffer.from('الاسم,رقم الموبايل\n,01012345678\nNo Phone,\n'),
      );

      await service.processImportJob('job-1');

      expect(leads.createSystemLead).not.toHaveBeenCalled();
      expect(finalUpdate()).toEqual(
        expect.objectContaining({
          status: JobStatus.FAILED,
          failedRows: 2,
          errorSummary: [
            { row: 2, reason: 'Missing name', kind: 'error' },
            { row: 3, reason: 'Missing phone', kind: 'error' },
          ],
        }),
      );
    });

    it('auto-maps headers for jobs without a stored mapping', async () => {
      job(null);
      storage.getObject.mockResolvedValue(
        Buffer.from(
          'fullName,primaryPhone,sourceName\nJane,1012345678,facebook\n',
        ),
      );

      await service.processImportJob('job-1');

      expect(leads.createSystemLead.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          fullName: 'Jane',
          primaryPhone: '01012345678',
          sourceId: 'source-fb',
        }),
      );
      expect(leads.getDefaultPipelinePlacement).toHaveBeenCalledWith(
        'tenant-1',
      );
    });

    it('fails the job when a mapped column is missing from the file', async () => {
      job(storedOptions());
      storage.getObject.mockResolvedValue(Buffer.from('name,phone\nA,1\n'));

      await service.processImportJob('job-1');

      expect(leads.createSystemLead).not.toHaveBeenCalled();
      expect(finalUpdate()).toEqual(
        expect.objectContaining({ status: JobStatus.FAILED }),
      );
    });

    it('imports XLSX workbooks', async () => {
      job(
        storedOptions({
          mapping: { Name: 'fullName', Mobile: 'primaryPhone' },
        }),
      );
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sheet1');
      sheet.addRow(['Name', 'Mobile']);
      sheet.addRow(['Jane', 1012345678]);
      storage.getObject.mockResolvedValue(
        Buffer.from(await workbook.xlsx.writeBuffer()),
      );
      prisma.fileAsset.findFirst.mockResolvedValue({
        id: 'file-1',
        category: 'IMPORT_FILE',
        objectKey: 'imports/leads.xlsx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        originalFilename: 'leads.xlsx',
        sizeBytes: BigInt(4096),
      });

      await service.processImportJob('job-1');

      expect(leads.createSystemLead.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          fullName: 'Jane',
          primaryPhone: '01012345678',
        }),
      );
    });
  });

  describe('creating a job', () => {
    it('validates and stores mapping, defaults and duplicate policy', async () => {
      const result = await service.createLeadImportJob(
        'tenant-1',
        'user-1',
        {
          fileAssetId: 'file-1',
          mapping: { ...MAPPING },
          defaults: {
            sourceId: 'source-default',
            pipelineId: 'pipeline-2',
            pipelineStageId: 'stage-2',
            assignedUserId: 'agent-sara',
          },
          duplicatePolicy: ImportDuplicatePolicy.CREATE,
        },
        { scope: MANAGER, canAssign: true },
      );

      const data = prisma.importJob.create.mock.calls[0][0].data;
      expect(data.duplicatePolicy).toBe(ImportDuplicatePolicy.CREATE);
      expect(data.options).toEqual({
        version: 1,
        mapping: { ...MAPPING },
        defaults: {
          sourceId: 'source-default',
          pipelineId: 'pipeline-2',
          pipelineStageId: 'stage-2',
          assignedUserId: 'agent-sara',
        },
        canAssign: true,
        scope: { kind: 'all' },
      });
      expect(queue.enqueueImportJob).toHaveBeenCalledWith('job-1');
      expect(result).toEqual(
        expect.objectContaining({
          skippedRows: 0,
          duplicatePolicy: ImportDuplicatePolicy.CREATE,
          options: {
            mapping: { ...MAPPING },
            defaults: expect.objectContaining({ sourceId: 'source-default' }),
          },
        }),
      );
      // Not visible to clients.
      expect(result.options).not.toHaveProperty('scope');
    });

    it('keeps the old contract: only a fileAssetId means auto-mapping', async () => {
      await service.createLeadImportJob(
        'tenant-1',
        'user-1',
        { fileAssetId: 'file-1' },
        { scope: MANAGER, canAssign: false },
      );

      const data = prisma.importJob.create.mock.calls[0][0].data;
      expect(data.duplicatePolicy).toBe(ImportDuplicatePolicy.SKIP);
      expect(data.options).toEqual(
        expect.objectContaining({ mapping: null, defaults: {} }),
      );
    });

    it('drops the assignee column without lead.assign', async () => {
      await service.createLeadImportJob(
        'tenant-1',
        'user-1',
        { fileAssetId: 'file-1', mapping: { ...MAPPING } },
        { scope: AGENT, canAssign: false },
      );

      const data = prisma.importJob.create.mock.calls[0][0].data;
      expect(data.options.mapping.Agent).toBeNull();
      // Agents can only import files they uploaded.
      expect(prisma.fileAsset.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ uploadedByUserId: 'user-1' }),
        }),
      );
    });

    it('rejects a default assignee without lead.assign', async () => {
      await expect(
        service.createLeadImportJob(
          'tenant-1',
          'user-1',
          {
            fileAssetId: 'file-1',
            mapping: { ...MAPPING },
            defaults: { assignedUserId: 'agent-sara' },
          },
          { scope: AGENT, canAssign: false },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.importJob.create).not.toHaveBeenCalled();
    });

    it('rejects a stage outside the chosen pipeline and closed stages', async () => {
      prisma.pipelineStage.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createLeadImportJob(
          'tenant-1',
          'user-1',
          {
            fileAssetId: 'file-1',
            mapping: { ...MAPPING },
            defaults: { pipelineId: 'pipeline-1', pipelineStageId: 'stage-2' },
          },
          { scope: MANAGER, canAssign: true },
        ),
      ).rejects.toThrow(/does not belong to the selected pipeline/);

      prisma.pipelineStage.findFirst.mockResolvedValueOnce({
        id: 'stage-won',
        pipelineId: 'pipeline-2',
        isClosed: true,
      });
      await expect(
        service.createLeadImportJob(
          'tenant-1',
          'user-1',
          {
            fileAssetId: 'file-1',
            mapping: { ...MAPPING },
            defaults: { pipelineStageId: 'stage-won' },
          },
          { scope: MANAGER, canAssign: true },
        ),
      ).rejects.toThrow(/closed stage/);
    });

    it('rejects mappings without name and phone', async () => {
      await expect(
        service.createLeadImportJob(
          'tenant-1',
          'user-1',
          { fileAssetId: 'file-1', mapping: { الاسم: 'fullName' } },
          { scope: MANAGER, canAssign: true },
        ),
      ).rejects.toThrow(/Map a column to: Phone/);
    });

    it('rejects files over the upload size limit before reading them', async () => {
      prisma.fileAsset.findFirst.mockResolvedValue({
        id: 'file-1',
        category: 'IMPORT_FILE',
        objectKey: 'imports/huge.csv',
        mimeType: 'text/csv',
        originalFilename: 'huge.csv',
        sizeBytes: BigInt(200 * 1024 * 1024),
      });

      await expect(
        service.previewImport('tenant-1', 'file-1', {
          scope: MANAGER,
          canAssign: true,
        }),
      ).rejects.toThrow(/larger than/);
      expect(storage.getObject).not.toHaveBeenCalled();
    });
  });

  describe('preview', () => {
    it('returns headers, sample rows and a suggested mapping', async () => {
      const preview = await service.previewImport('tenant-1', 'file-1', {
        scope: AGENT,
        canAssign: false,
      });

      expect(preview).toEqual(
        expect.objectContaining({
          fileAssetId: 'file-1',
          fileType: 'csv',
          totalRows: 2,
          headers: Object.keys(MAPPING),
        }),
      );
      expect(preview.sampleRows[0][0]).toBe('أحمد علي');
      expect(preview.suggestedMapping).toEqual({
        ...MAPPING,
        // Assignment is ignored without lead.assign.
        Agent: null,
      });
      expect(preview.fields.map((field) => field.key)).not.toContain(
        'assignee',
      );
    });
  });
});
