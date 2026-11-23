import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ExportFormat,
  ExportType,
  FileAssetCategory,
  JobStatus,
  Prisma,
  AuditActorType,
} from '@crmpro/database';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../../common/pagination';
import { buildOrderBy, SortOrder } from '../../../common/query';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TenantAccessService } from '../../../common/tenant-access/tenant-access.service';
import { TenantInactiveException } from '../../../common/tenant-access/tenant-access.exception';
import { FilesService } from '../../files/files.service';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { ExportCompletedEvent } from '../../../common/events/domain-event.types';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { LeadExportParams } from '../../leads/types/lead.types';
import { QueueService } from '../../jobs/queues/queue.service';
import {
  AUDIT_ENTITY_TYPES,
  EXPORT_AUDIT_ACTIONS,
} from '../../audit/audit.constants';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { CreateLeadExportDto } from '../dto/create-lead-export.dto';
import { normalizeLeadExportFilters } from '../utils/lead-export-filters.util';
import { GetExportJobsQueryDto } from '../dto/get-export-jobs-query.dto';
import {
  CreateExportJobResponse,
  ExportJobResponse,
  LeadExportRow,
} from '../entities/export-job.types';
import {
  EXPORT_CSV_MIME_TYPE,
  EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS,
  EXPORT_XLSX_MIME_TYPE,
} from '../export-jobs.constants';
import { CsvExportService } from './csv-export.service';
import type { ExportColumn } from './export-columns';
import { LeadExportService } from './lead-export.service';
import { XlsxExportService } from './xlsx-export.service';
import { SYSTEM_LEAD_SCOPE } from '../../../common/auth';
import {
  type LeadScope,
  parseStoredLeadScope,
  toStoredLeadScope,
} from '../../../common/auth';

/** File extension and MIME type for each format the worker can produce. */
const EXPORT_FILE_TYPES: Partial<
  Record<ExportFormat, { extension: string; mimeType: string }>
> = {
  [ExportFormat.CSV]: { extension: 'csv', mimeType: EXPORT_CSV_MIME_TYPE },
  [ExportFormat.XLSX]: { extension: 'xlsx', mimeType: EXPORT_XLSX_MIME_TYPE },
};

const EXPORT_JOB_SORT_FIELDS = ['createdAt', 'updatedAt', 'status'] as const;

const EXPORT_JOB_SORT_CONFIG = {
  allowedFields: EXPORT_JOB_SORT_FIELDS,
  defaultField: 'createdAt' as const,
  defaultOrder: SortOrder.DESC,
};

const exportJobSelect = {
  id: true,
  exportType: true,
  format: true,
  status: true,
  progress: true,
  rowCount: true,
  filters: true,
  errorMessage: true,
  fileAssetId: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  fileAsset: {
    select: {
      id: true,
      originalFilename: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.ExportJobSelect;

type ExportJobRecord = Prisma.ExportJobGetPayload<{
  select: typeof exportJobSelect;
}>;

/** Without whole-organization visibility, people only see their own jobs. */
function jobOwnerWhere(scope: LeadScope): { createdByUserId?: string } {
  return scope.kind === 'all' || scope.actorUserId === null
    ? {}
    : { createdByUserId: scope.actorUserId };
}

@Injectable()
export class ExportJobsService {
  private readonly logger = new Logger(ExportJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly leadExportService: LeadExportService,
    private readonly csvExportService: CsvExportService,
    private readonly xlsxExportService: XlsxExportService,
    private readonly queueService: QueueService,
    private readonly domainEventBus: DomainEventBus,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly tenantAccessService: TenantAccessService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async createLeadExportJob(
    tenantId: string,
    userId: string,
    dto: CreateLeadExportDto,
    scope: LeadScope,
  ): Promise<CreateExportJobResponse> {
    this.leadExportService.assertSupportedFormat(dto.format);

    const activeJob = await this.prisma.exportJob.findFirst({
      where: {
        tenantId,
        createdByUserId: userId,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
      select: { id: true, status: true },
    });

    if (activeJob) {
      throw new ConflictException(
        'An export is already in progress. Wait for it to finish or cancel it before starting a new one.',
      );
    }

    const exportParams = this.normalizeExportParams(dto);

    const job = await this.prisma.exportJob.create({
      data: {
        tenantId,
        createdByUserId: userId,
        exportType: ExportType.LEADS,
        format: dto.format,
        filters: exportParams as unknown as Prisma.InputJsonValue,
        // The worker exports exactly what the requester could see.
        leadScope: toStoredLeadScope(scope),
        status: JobStatus.PENDING,
        progress: 0,
      },
      select: { id: true, status: true },
    });

    await this.queueService.enqueueExportJob(job.id);

    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId: userId,
      action: EXPORT_AUDIT_ACTIONS.STARTED,
      entityType: AUDIT_ENTITY_TYPES.EXPORT_JOB,
      entityId: job.id,
    });

    return job;
  }

  async processExportJob(jobId: string): Promise<void> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        tenantId: true,
        createdByUserId: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Export job ${jobId} not found`);
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return;
    }

    try {
      await this.tenantAccessService.assertTenantAccessible(job.tenantId);
    } catch (error) {
      if (error instanceof TenantInactiveException) {
        await this.failExportJobIfActive(job.id, error.message);
        return;
      }

      throw error;
    }

    const claimed = await this.claimExportJob(job.id);
    if (!claimed) {
      this.logger.log(
        `Export job ${jobId} was not claimed (already processing or completed)`,
      );
      return;
    }

    await this.runExportJob(job.id, job.tenantId, job.createdByUserId);
  }

  private async claimExportJob(jobId: string): Promise<boolean> {
    const result = await this.prisma.exportJob.updateMany({
      where: {
        id: jobId,
        status: JobStatus.PENDING,
      },
      data: {
        status: JobStatus.PROCESSING,
        progress: 5,
        errorMessage: null,
      },
    });

    return result.count === 1;
  }

  async failExportJobIfActive(
    jobId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.exportJob.updateMany({
      where: {
        id: jobId,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
      data: {
        status: JobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async getExportJob(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<ExportJobResponse> {
    const job = await this.getExportJobOrThrow(id, tenantId, scope);
    return this.toExportJobResponse(job, tenantId);
  }

  async listExportJobs(
    tenantId: string,
    query: GetExportJobsQueryDto,
    scope: LeadScope,
  ): Promise<PaginatedResponse<ExportJobResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const orderBy = buildOrderBy(
      query.sortBy,
      query.sortOrder,
      EXPORT_JOB_SORT_CONFIG,
    );
    const where: Prisma.ExportJobWhereInput = {
      tenantId,
      ...jobOwnerWhere(scope),
      ...(query.status ? { status: query.status } : {}),
      ...(query.exportType ? { exportType: query.exportType } : {}),
    };

    const [jobs, totalItems] = await this.prisma.$transaction([
      this.prisma.exportJob.findMany({
        where,
        orderBy,
        select: exportJobSelect,
        skip,
        take,
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    const items = await Promise.all(
      jobs.map((job) => this.toExportJobResponse(job, tenantId)),
    );

    return buildPaginatedResponse(items, page, limit, totalItems);
  }

  private async runExportJob(
    jobId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: jobId, tenantId },
      select: {
        id: true,
        format: true,
        filters: true,
        leadScope: true,
        exportType: true,
      },
    });

    if (!job) {
      return;
    }

    this.logger.log(`Export job ${jobId} started`);

    try {
      const fileType = this.getExportFileType(job.format);
      const exportParams = this.parseExportParams(job.filters);

      const rows = await this.leadExportService.fetchAllForExport(
        tenantId,
        exportParams,
        parseStoredLeadScope(job.leadScope),
        async (processedRows, totalRows) => {
          const progress =
            totalRows === 0
              ? 50
              : Math.min(70, 10 + Math.floor((processedRows / totalRows) * 60));

          await this.prisma.exportJob.update({
            where: { id: jobId },
            data: { progress },
          });
        },
      );

      this.logger.log(
        `Export job ${jobId}: loaded ${rows.length} lead(s) for ${job.format} generation`,
      );

      const columns = await this.leadExportService.loadColumns(tenantId);
      const fileBuffer = await this.generateExportBuffer(
        job.format,
        rows,
        columns,
      );

      this.logger.log(`Export job ${jobId}: ${job.format} generated`);

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { progress: 80 },
      });

      const file = await this.filesService.createServerGeneratedFile({
        tenantId,
        userId,
        category: FileAssetCategory.EXPORT_FILE,
        buffer: fileBuffer,
        fileName: `leads-export-${jobId}.${fileType.extension}`,
        mimeType: fileType.mimeType,
      });

      this.logger.log(
        `Export job ${jobId}: uploaded to S3 and FileAsset ${file.id} created`,
      );

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          progress: 100,
          rowCount: rows.length,
          fileAssetId: file.id,
          completedAt: new Date(),
          errorMessage: null,
        },
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorType: AuditActorType.SYSTEM,
        actorUserId: null,
        action: EXPORT_AUDIT_ACTIONS.COMPLETED,
        entityType: AUDIT_ENTITY_TYPES.EXPORT_JOB,
        entityId: jobId,
        metadata: {
          rowCount: rows.length,
        },
      });

      this.logger.log(`Export job ${jobId} completed`);
      void this.domainEventBus.publish(
        new ExportCompletedEvent(tenantId, jobId),
      );
      void this.notificationTrigger.notifyExportCompleted({
        tenantId,
        recipientUserId: userId,
        exportJobId: jobId,
        rowCount: rows.length,
        exportType: job.exportType,
      });
    } catch (error: unknown) {
      const message =
        error instanceof BadRequestException
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Export failed';

      this.logger.error(`Export job ${jobId} failed: ${message}`);

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
    }
  }

  private async generateExportBuffer(
    format: ExportFormat,
    rows: LeadExportRow[],
    columns: ExportColumn<LeadExportRow>[],
  ): Promise<Buffer> {
    if (format === ExportFormat.XLSX) {
      return this.xlsxExportService.generateXlsx(rows, columns);
    }

    return this.csvExportService.generateCsv(rows, columns);
  }

  private getExportFileType(format: ExportFormat): {
    extension: string;
    mimeType: string;
  } {
    const fileType = EXPORT_FILE_TYPES[format];

    if (!fileType) {
      throw new BadRequestException(`Export format ${format} is not supported`);
    }

    return fileType;
  }

  private normalizeExportParams(dto: CreateLeadExportDto): LeadExportParams {
    return {
      ...normalizeLeadExportFilters(dto.filters),
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder ?? SortOrder.DESC,
    };
  }

  private parseExportParams(value: Prisma.JsonValue): LeadExportParams {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { sortOrder: SortOrder.DESC };
    }

    const record = value as Record<string, unknown>;

    return {
      // Sort keys are not filters; the DTO whitelist leaves them out.
      ...normalizeLeadExportFilters(record),
      sortBy: typeof record.sortBy === 'string' ? record.sortBy : undefined,
      sortOrder:
        record.sortOrder === SortOrder.ASC ||
        record.sortOrder === SortOrder.DESC
          ? record.sortOrder
          : SortOrder.DESC,
    };
  }

  private async getExportJobOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<ExportJobRecord> {
    const job = await this.prisma.exportJob.findFirst({
      where: { id, tenantId, ...jobOwnerWhere(scope) },
      select: exportJobSelect,
    });

    if (!job) {
      throw new NotFoundException('Export job not found');
    }

    return job;
  }

  private async toExportJobResponse(
    job: ExportJobRecord,
    tenantId: string,
  ): Promise<ExportJobResponse> {
    const download =
      job.status === JobStatus.COMPLETED && job.fileAssetId
        ? await this.filesService.getDownloadUrl(
            job.fileAssetId,
            tenantId,
            SYSTEM_LEAD_SCOPE,
            {
              expiresInSeconds: EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS,
            },
          )
        : null;

    return {
      id: job.id,
      exportType: job.exportType,
      format: job.format,
      status: job.status,
      progress: job.progress,
      rowCount: job.rowCount,
      filters: this.parseExportParams(job.filters),
      errorMessage: job.errorMessage,
      fileAssetId: job.fileAssetId,
      fileAsset: job.fileAsset,
      download: download
        ? {
            downloadUrl: download.downloadUrl,
            expiresInSeconds: download.expiresInSeconds,
          }
        : null,
      createdBy: job.createdBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }
}
