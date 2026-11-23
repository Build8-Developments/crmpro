import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CustomFieldType,
  ImportDuplicatePolicy,
  JobStatus,
} from '@crmpro/database';
import type { LeadScope } from '../../common/auth';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import type { CustomFieldDefinitionLike } from '../custom-fields/custom-field-values';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { QueueService } from '../jobs/queues/queue.service';
import { LeadsService } from '../leads/leads.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { ImportJobsService } from './import-jobs.service';
import type { StoredImportJobOptions } from './types/import-job.types';

const MANAGER: LeadScope = { kind: 'all', actorUserId: 'user-1' };

const definitions: CustomFieldDefinitionLike[] = [
  {
    key: 'unit_type',
    label: 'نوع الوحدة',
    type: CustomFieldType.SELECT,
    options: ['Apartment', 'Villa'],
    isRequired: true,
    archivedAt: null,
  },
  {
    key: 'bedrooms',
    label: 'Bedrooms',
    type: CustomFieldType.NUMBER,
    options: null,
    isRequired: false,
    archivedAt: null,
  },
  {
    key: 'old_code',
    label: 'Old code',
    type: CustomFieldType.TEXT,
    options: null,
    isRequired: false,
    archivedAt: new Date('2026-11-01'),
  },
];

const CSV = [
  'Name,Phone,نوع الوحدة,Bedrooms',
  'Ahmed,01012345678,villa,٣',
  'Mona,01098765432,Penthouse,2',
  'Omar,01011112222,,4',
  'Sara,01033334444,Apartment,many',
].join('\n');

function storedOptions(
  mapping: StoredImportJobOptions['mapping'],
): StoredImportJobOptions {
  return {
    version: 1,
    mapping,
    defaults: {},
    canAssign: true,
    scope: { kind: 'all' },
  };
}

describe('ImportJobsService custom fields', () => {
  let service: ImportJobsService;
  let leads: { createSystemLead: jest.Mock };
  let prisma: Record<string, Record<string, jest.Mock>>;

  const job = (options: StoredImportJobOptions | null) => {
    prisma.importJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: JobStatus.PENDING,
      tenantId: 'tenant-1',
      createdByUserId: 'user-1',
      fileAssetId: 'file-1',
      duplicatePolicy: ImportDuplicatePolicy.SKIP,
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
    leads = {
      createSystemLead: jest
        .fn()
        .mockResolvedValue({ status: 'created', leadId: 'lead-1' }),
    };
    prisma = {
      importJob: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
        create: jest.fn(),
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
      leadSource: { findMany: jest.fn().mockResolvedValue([]) },
      project: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      pipelineStage: { findFirst: jest.fn() },
      pipeline: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportJobsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StorageService,
          useValue: {
            getObject: jest.fn().mockResolvedValue(Buffer.from(CSV)),
          },
        },
        {
          provide: LeadsService,
          useValue: {
            ...leads,
            getDefaultPipelinePlacement: jest.fn().mockResolvedValue({
              pipelineId: 'p-1',
              pipelineStageId: 's-1',
            }),
          },
        },
        {
          provide: CustomFieldsService,
          useValue: {
            getLeadDefinitions: jest.fn().mockResolvedValue(definitions),
          },
        },
        { provide: QueueService, useValue: { enqueueImportJob: jest.fn() } },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: NotificationTriggerService,
          useValue: { notifyImportCompleted: jest.fn() },
        },
        {
          provide: TenantAccessService,
          useValue: {
            assertTenantAccessible: jest.fn(),
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

  it('offers active custom fields as targets and matches Arabic labels', async () => {
    const preview = await service.previewImport('tenant-1', 'file-1', {
      scope: MANAGER,
      canAssign: true,
    });

    expect(preview.suggestedMapping).toEqual({
      Name: 'fullName',
      Phone: 'primaryPhone',
      'نوع الوحدة': 'custom:unit_type',
      Bedrooms: 'custom:bedrooms',
    });
    const custom = preview.fields.filter((field) => field.custom);
    expect(custom).toEqual([
      {
        key: 'custom:unit_type',
        label: 'نوع الوحدة',
        required: false,
        custom: true,
      },
      {
        key: 'custom:bedrooms',
        label: 'Bedrooms',
        required: false,
        custom: true,
      },
    ]);
  });

  it('refuses a mapping to an archived or unknown custom field', async () => {
    await expect(
      service.createLeadImportJob(
        'tenant-1',
        'user-1',
        {
          fileAssetId: 'file-1',
          mapping: {
            Name: 'fullName',
            Phone: 'primaryPhone',
            X: 'custom:old_code',
          },
        },
        { scope: MANAGER, canAssign: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.importJob.create).not.toHaveBeenCalled();
  });

  it('validates each row and reports bad values per row', async () => {
    job(
      storedOptions({
        Name: 'fullName',
        Phone: 'primaryPhone',
        'نوع الوحدة': 'custom:unit_type',
        Bedrooms: 'custom:bedrooms',
      }),
    );

    await service.processImportJob('job-1');

    expect(leads.createSystemLead).toHaveBeenCalledTimes(1);
    expect(leads.createSystemLead.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        fullName: 'Ahmed',
        customFields: { unit_type: 'Villa', bedrooms: 3 },
      }),
    );
    expect(finalUpdate()).toEqual(
      expect.objectContaining({
        successfulRows: 1,
        failedRows: 3,
        errorSummary: [
          {
            row: 3,
            reason: 'نوع الوحدة must be one of the listed options',
            kind: 'error',
          },
          { row: 4, reason: 'نوع الوحدة is required', kind: 'error' },
          { row: 5, reason: 'Bedrooms must be a number', kind: 'error' },
        ],
      }),
    );
  });

  it('never blocks rows on a required field whose column is not mapped', async () => {
    job(
      storedOptions({
        Name: 'fullName',
        Phone: 'primaryPhone',
        Bedrooms: 'custom:bedrooms',
      }),
    );

    await service.processImportJob('job-1');

    // Row 5 ("many") still fails; the unmapped required unit type does not.
    expect(leads.createSystemLead).toHaveBeenCalledTimes(3);
    expect(finalUpdate()).toEqual(
      expect.objectContaining({ successfulRows: 3, failedRows: 1 }),
    );
  });
});
