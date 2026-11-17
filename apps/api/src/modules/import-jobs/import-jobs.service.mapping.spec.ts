import { BadRequestException } from '@nestjs/common';
import {
  CustomFieldType,
  ImportDuplicatePolicy,
  JobStatus,
} from '@crmpro/database';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import { ImportJobsService } from './import-jobs.service';

const CSV = [
  'الاسم,رقم الموبايل,المصدر,المشروع,نوع الوحدة,الميزانية',
  'أحمد علي,1012345678,Facebook,Mivida,villa,2.5M',
  'منى حسن,01198765432,TikTok,,Apartment,',
  'Bad Budget,01000000000,,,,soon',
].join('\n');

function buildService(overrides: {
  csv?: string;
  options?: unknown;
  alreadyImported?: number[];
  createResult?: jest.Mock;
  autoAssign?: boolean;
  customFields?: unknown[];
}) {
  const createLeadFromImport =
    overrides.createResult ??
    jest.fn().mockResolvedValue({
      success: true,
      leadId: 'lead-x',
      assignedUserId: null,
    });

  const prisma = {
    importJob: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'job-1',
        status: JobStatus.PENDING,
        tenantId: 'tenant-1',
        createdByUserId: 'user-1',
        fileAssetId: 'file-1',
        duplicatePolicy: ImportDuplicatePolicy.SKIP,
        options: overrides.options ?? null,
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      create: jest
        .fn()
        .mockImplementation(
          ({ data }: { data: { duplicatePolicy: ImportDuplicatePolicy } }) => ({
            id: 'job-1',
            status: JobStatus.PENDING,
            totalRows: 0,
            processedRows: 0,
            successfulRows: 0,
            failedRows: 0,
            skippedRows: 0,
            duplicatePolicy: data.duplicatePolicy,
            errorSummary: null,
            fileAsset: { id: 'file-1', originalFilename: 'leads.csv' },
            createdBy: { id: 'user-1', name: 'Owner', email: 'o@x.com' },
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
          }),
        ),
    },
    fileAsset: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'file-1',
        category: 'IMPORT_FILE',
        objectKey: 'imports/file.csv',
        mimeType: 'text/csv',
        originalFilename: 'leads.csv',
      }),
    },
    customFieldDefinition: {
      findMany: jest.fn().mockResolvedValue(
        overrides.customFields ?? [
          {
            key: 'unit_type',
            label: 'نوع الوحدة',
            type: CustomFieldType.SELECT,
            options: ['Villa', 'Apartment'],
            isRequired: false,
          },
        ],
      ),
    },
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({
        defaultCountryCode: 'EG',
        autoAssignEnabled: overrides.autoAssign ?? false,
      }),
    },
    lead: {
      findMany: jest.fn().mockResolvedValue(
        (overrides.alreadyImported ?? []).map((importRowNumber) => ({
          importRowNumber,
        })),
      ),
    },
    leadSource: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'src-facebook', name: 'Facebook' }]),
      upsert: jest.fn().mockResolvedValue({ id: 'src-new' }),
      findFirst: jest.fn(),
    },
    project: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'project-mivida', name: 'Mivida' }]),
      findFirst: jest.fn(),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    pipelineStage: { findFirst: jest.fn() },
  };

  const storage = {
    getObject: jest.fn().mockResolvedValue(Buffer.from(overrides.csv ?? CSV)),
  };
  const leads = {
    getDefaultPipelinePlacement: jest
      .fn()
      .mockResolvedValue({ pipelineId: 'p-1', pipelineStageId: 's-1' }),
    createLeadFromImport,
  };
  const distribution = { autoAssignNewLead: jest.fn().mockResolvedValue(null) };

  const service = new ImportJobsService(
    prisma as never,
    storage as never,
    leads as never,
    { enqueueImportJob: jest.fn() } as never,
    { publish: jest.fn() } as never,
    { notifyImportCompleted: jest.fn() } as never,
    { assertTenantActive: jest.fn() } as never,
    { createAuditLog: jest.fn() } as never,
    distribution as never,
  );

  return { service, prisma, leads, distribution };
}

function finalUpdate(prisma: ReturnType<typeof buildService>['prisma']) {
  const calls = prisma.importJob.update.mock.calls as Array<
    [{ data: Record<string, unknown> }]
  >;
  return calls[calls.length - 1][0].data;
}

describe('ImportJobsService mapping & processing', () => {
  it('imports an Arabic CSV with auto-detected columns', async () => {
    const { service, prisma, leads } = buildService({});

    await service.processImportJob('job-1');

    expect(leads.createLeadFromImport).toHaveBeenCalledTimes(2);
    type Row = Record<string, unknown>;
    const calls = leads.createLeadFromImport.mock.calls as Array<
      [string, string, string, Row]
    >;
    const first = calls[0][3];
    expect(first).toMatchObject({
      fullName: 'أحمد علي',
      primaryPhone: '01012345678', // trunk zero restored
      sourceId: 'src-facebook',
      projectIds: ['project-mivida'],
      budgetMin: 2_500_000,
      customFields: { unit_type: 'Villa' }, // matched case-insensitively
      importRowNumber: 2,
      allowDuplicates: false,
    });

    const second = calls[1][3];
    // Unknown source names become new sources.
    expect(second.sourceId).toBe('src-new');
    expect(prisma.leadSource.upsert).toHaveBeenCalledTimes(1);

    expect(finalUpdate(prisma)).toMatchObject({
      status: JobStatus.PARTIAL_SUCCESS,
      totalRows: 3,
      successfulRows: 2,
      failedRows: 1,
      skippedRows: 0,
      errorSummary: [
        { row: 4, reason: 'Budget must be a number', kind: 'error' },
      ],
    });
  });

  it('skips rows an earlier attempt already imported', async () => {
    const { service, prisma, leads } = buildService({
      alreadyImported: [2, 3],
    });

    await service.processImportJob('job-1', { isRetry: true });

    // Only the budget row is processed (and fails validation before create).
    expect(leads.createLeadFromImport).not.toHaveBeenCalled();
    expect(finalUpdate(prisma)).toMatchObject({
      successfulRows: 2,
      failedRows: 1,
    });
  });

  it('counts duplicates as skipped, not failed', async () => {
    const { service, prisma } = buildService({
      csv: 'name,phone\nA Lead,01000000001',
      createResult: jest.fn().mockResolvedValue({
        success: false,
        reason: 'Duplicate of an existing lead',
        duplicate: true,
      }),
    });

    await service.processImportJob('job-1');

    expect(finalUpdate(prisma)).toMatchObject({
      status: JobStatus.COMPLETED,
      successfulRows: 0,
      failedRows: 0,
      skippedRows: 1,
      errorSummary: [
        { row: 2, reason: 'Duplicate of an existing lead', kind: 'duplicate' },
      ],
    });
  });

  it('fails rows that miss a required custom field', async () => {
    const { service, prisma, leads } = buildService({
      csv: 'name,phone\nA Lead,01000000001',
      customFields: [
        {
          key: 'budget_band',
          label: 'Budget band',
          type: CustomFieldType.TEXT,
          options: null,
          isRequired: true,
        },
      ],
    });

    await service.processImportJob('job-1');

    expect(leads.createLeadFromImport).not.toHaveBeenCalled();
    expect(finalUpdate(prisma)).toMatchObject({
      failedRows: 1,
      errorSummary: [
        { row: 2, reason: 'Budget band is required', kind: 'error' },
      ],
    });
  });

  it('uses the stored mapping and hands unassigned leads to round-robin', async () => {
    const { service, leads, distribution } = buildService({
      csv: 'col a,col b\n01000000001,Lead Name',
      options: {
        mapping: { primaryPhone: 0, fullName: 1 },
        defaults: {},
        scope: { kind: 'all' },
      },
      autoAssign: true,
    });

    await service.processImportJob('job-1');

    const [[, , , row]] = leads.createLeadFromImport.mock.calls as Array<
      [string, string, string, Record<string, unknown>]
    >;
    expect(row).toMatchObject({
      fullName: 'Lead Name',
      primaryPhone: '01000000001',
    });
    expect(distribution.autoAssignNewLead).toHaveBeenCalledWith(
      'tenant-1',
      'lead-x',
    );
  });

  it('fails the job when no column can be the phone', async () => {
    const { service, prisma } = buildService({ csv: 'name,city\nA,Cairo' });

    await service.processImportJob('job-1');

    expect(finalUpdate(prisma)).toMatchObject({
      status: JobStatus.FAILED,
      errorSummary: [{ row: 0, reason: 'The file has no column for: Phone' }],
    });
  });
});

describe('ImportJobsService.createLeadImportJob', () => {
  const managerKeys = new Set<PermissionKey>([
    PERMISSIONS.IMPORT_JOB_CREATE,
    PERMISSIONS.LEAD_READ_TEAM,
  ]);
  const teamScope = {
    kind: 'team' as const,
    actorUserId: 'user-1',
    userIds: ['user-1', 'agent-1'],
  };

  it('only lets the uploader use an import file without lead.read-all', async () => {
    const { service, prisma } = buildService({});

    await service.createLeadImportJob(
      'tenant-1',
      'user-1',
      { fileAssetId: 'file-1' },
      managerKeys,
      teamScope,
    );

    expect(prisma.fileAsset.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          uploadedByUserId: 'user-1',
        }) as unknown,
      }),
    );
  });

  it('rejects assignment without lead.assign', async () => {
    const { service } = buildService({});

    await expect(
      service.createLeadImportJob(
        'tenant-1',
        'user-1',
        {
          fileAssetId: 'file-1',
          mapping: { fullName: 0, primaryPhone: 1, assignee: 2 },
        },
        managerKeys,
        teamScope,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a default assignee outside the importer scope', async () => {
    const { service, prisma } = buildService({});
    prisma.user.findFirst.mockResolvedValue({ id: 'other-team-agent' });

    await expect(
      service.createLeadImportJob(
        'tenant-1',
        'user-1',
        {
          fileAssetId: 'file-1',
          defaults: { assignedUserId: 'other-team-agent' },
        },
        new Set([...managerKeys, PERMISSIONS.LEAD_ASSIGN]),
        teamScope,
      ),
    ).rejects.toThrow('Assigned user not found');
  });

  it('stores mapping, defaults, policy and the frozen scope', async () => {
    const { service, prisma } = buildService({});
    prisma.project.findFirst.mockResolvedValue({ id: 'project-mivida' });

    const job = await service.createLeadImportJob(
      'tenant-1',
      'user-1',
      {
        fileAssetId: 'file-1',
        mapping: { fullName: 0, primaryPhone: 1 },
        defaults: { projectId: 'project-mivida' },
        duplicatePolicy: ImportDuplicatePolicy.CREATE,
      },
      managerKeys,
      teamScope,
    );

    expect(job.duplicatePolicy).toBe(ImportDuplicatePolicy.CREATE);
    expect(prisma.importJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          duplicatePolicy: ImportDuplicatePolicy.CREATE,
          options: {
            mapping: { fullName: 0, primaryPhone: 1 },
            defaults: { projectId: 'project-mivida' },
            scope: teamScope,
          },
        }) as unknown,
      }),
    );
  });
});
