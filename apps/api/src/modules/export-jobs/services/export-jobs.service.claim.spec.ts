import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ExportFormat, FileAssetCategory, JobStatus } from '@crmpro/database';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantAccessService } from '../../../common/tenant-access/tenant-access.service';
import { FilesService } from '../../files/files.service';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { QueueService } from '../../jobs/queues/queue.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { CsvExportService } from './csv-export.service';
import { ExportJobsService } from './export-jobs.service';
import { LEAD_EXPORT_COLUMNS } from './export-columns';
import { LeadExportService } from './lead-export.service';
import { XlsxExportService } from './xlsx-export.service';
import { EXPORT_XLSX_MIME_TYPE } from '../export-jobs.constants';
import { LeadExportRow } from '../entities/export-job.types';

describe('ExportJobsService job claiming', () => {
  let service: ExportJobsService;
  let leadExportService: {
    fetchAllForExport: jest.Mock;
    loadColumns: jest.Mock;
  };
  let filesService: { createServerGeneratedFile: jest.Mock };
  let csvExportService: { generateCsv: jest.Mock };
  let prisma: {
    exportJob: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    leadExportService = {
      fetchAllForExport: jest.fn(),
      loadColumns: jest.fn().mockResolvedValue(LEAD_EXPORT_COLUMNS),
    };
    filesService = {
      createServerGeneratedFile: jest.fn().mockResolvedValue({ id: 'file-1' }),
    };
    csvExportService = {
      generateCsv: jest.fn().mockReturnValue(Buffer.from('csv')),
    };

    prisma = {
      exportJob: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'job-1',
          status: JobStatus.PENDING,
          tenantId: 'tenant-1',
          createdByUserId: 'user-1',
        }),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportJobsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FilesService, useValue: filesService },
        { provide: LeadExportService, useValue: leadExportService },
        { provide: CsvExportService, useValue: csvExportService },
        // Real writer: the XLSX test reads the uploaded buffer back.
        XlsxExportService,
        { provide: QueueService, useValue: {} },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: NotificationTriggerService,
          useValue: { notifyExportCompleted: jest.fn() },
        },
        {
          provide: TenantAccessService,
          useValue: {
            assertTenantAccessible: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditWriterService,
          useValue: { createAuditLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ExportJobsService);
  });

  it('claims pending jobs atomically before processing', async () => {
    prisma.exportJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.exportJob.findFirst.mockResolvedValue({
      id: 'job-1',
      format: 'CSV',
      filters: { sortOrder: 'desc' },
      exportType: 'LEADS',
    });
    leadExportService.fetchAllForExport.mockResolvedValue([]);

    await service.processExportJob('job-1');

    expect(prisma.exportJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: JobStatus.PENDING },
      data: {
        status: JobStatus.PROCESSING,
        progress: 5,
        errorMessage: null,
      },
    });
    expect(leadExportService.fetchAllForExport).toHaveBeenCalled();
  });

  it('exits without processing when the job was already claimed', async () => {
    await service.processExportJob('job-1');

    expect(prisma.exportJob.updateMany).toHaveBeenCalledWith({
      where: { id: 'job-1', status: JobStatus.PENDING },
      data: {
        status: JobStatus.PROCESSING,
        progress: 5,
        errorMessage: null,
      },
    });
    expect(leadExportService.fetchAllForExport).not.toHaveBeenCalled();
    expect(prisma.exportJob.findFirst).not.toHaveBeenCalled();
  });

  describe('XLSX format', () => {
    const lead: LeadExportRow = {
      leadName: '=cmd|calc',
      primaryPhone: '01012345678',
      secondaryPhone: '',
      email: '',
      leadSource: '',
      pipeline: 'Sales',
      stage: 'New',
      assignedUser: '',
      interestedProjects: '',
      status: 'OPEN',
      createdAt: '2026-11-17T10:00:00.000Z',
      budgetMin: '3000000',
    };

    beforeEach(() => {
      prisma.exportJob.updateMany.mockResolvedValue({ count: 1 });
      prisma.exportJob.findFirst.mockResolvedValue({
        id: 'job-1',
        format: ExportFormat.XLSX,
        filters: { sortOrder: 'desc' },
        leadScope: null,
        exportType: 'LEADS',
      });
      leadExportService.fetchAllForExport.mockResolvedValue([lead]);
    });

    it('uploads an .xlsx workbook with the spreadsheet MIME type', async () => {
      await service.processExportJob('job-1');

      expect(csvExportService.generateCsv).not.toHaveBeenCalled();
      expect(filesService.createServerGeneratedFile).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          category: FileAssetCategory.EXPORT_FILE,
          fileName: 'leads-export-job-1.xlsx',
          mimeType: EXPORT_XLSX_MIME_TYPE,
        }),
      );
      expect(prisma.exportJob.update).toHaveBeenLastCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({
          status: JobStatus.COMPLETED,
          rowCount: 1,
          fileAssetId: 'file-1',
        }),
      });

      const [{ buffer }] = filesService.createServerGeneratedFile.mock
        .calls[0] as [{ buffer: Buffer }];
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const row = workbook.getWorksheet('Leads')!.getRow(2);

      expect(row.getCell(1).value).toBe("'=cmd|calc");
      expect(row.getCell(2).value).toBe('01012345678');
      expect(row.getCell(18).value).toBe(3000000);
    });

    it('fails the job for formats the worker cannot produce', async () => {
      prisma.exportJob.findFirst.mockResolvedValue({
        id: 'job-1',
        format: ExportFormat.PDF,
        filters: {},
        leadScope: null,
        exportType: 'LEADS',
      });

      await service.processExportJob('job-1');

      expect(leadExportService.fetchAllForExport).not.toHaveBeenCalled();
      expect(filesService.createServerGeneratedFile).not.toHaveBeenCalled();
      expect(prisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: expect.objectContaining({ status: JobStatus.FAILED }),
      });
    });
  });
});

describe('LeadExportService.assertSupportedFormat', () => {
  const service = new LeadExportService({} as never, {} as never, {} as never);

  it.each([ExportFormat.CSV, ExportFormat.XLSX])('accepts %s', (format) => {
    expect(() => service.assertSupportedFormat(format)).not.toThrow();
  });

  it('rejects PDF', () => {
    expect(() => service.assertSupportedFormat(ExportFormat.PDF)).toThrow(
      BadRequestException,
    );
  });
});
