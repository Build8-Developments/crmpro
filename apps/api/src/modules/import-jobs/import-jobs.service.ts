import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  FileAssetCategory,
  ImportDuplicatePolicy,
  ImportJob,
  JobStatus,
  Prisma,
} from '@crmpro/database';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { TenantInactiveException } from '../../common/tenant-access/tenant-access.exception';
import { StorageService } from '../../common/storage/storage.service';
import { LeadsService } from '../leads/leads.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import {
  CustomFieldValidationError,
  mergeCustomFieldValues,
  type CustomFieldDefinitionLike,
} from '../custom-fields/custom-field-values';
import type {
  DefaultPipelinePlacement,
  ImportLeadProfile,
  SystemLeadInput,
} from '../leads/types/lead.types';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { ImportCompletedEvent } from '../../common/events/domain-event.types';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QueueService } from '../jobs/queues/queue.service';
import {
  AUDIT_ENTITY_TYPES,
  IMPORT_AUDIT_ACTIONS,
} from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';
import { MAX_UPLOAD_FILE_SIZE_BYTES } from '../files/files.constants';
import {
  isAssigneeInScope,
  parseStoredLeadScope,
  toStoredLeadScope,
  type LeadScope,
} from '../../common/auth';
import {
  CreateLeadImportJobDto,
  ImportDefaultsDto,
} from './dto/create-lead-import-job.dto';
import { GetImportJobsQueryDto } from './dto/get-import-jobs-query.dto';
import { ImportLookups } from './import-lookups';
import {
  IMPORT_OPTIONS_VERSION,
  IMPORT_PREVIEW_ROWS,
  MAX_DUPLICATE_SUMMARY_ENTRIES,
  MAX_ERROR_SUMMARY_ENTRIES,
  MAX_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  PROGRESS_UPDATE_BATCH_SIZE,
} from './import-jobs.constants';
import { importedCustomFieldValue } from './mapping/import-custom-fields';
import {
  customFieldColumns,
  describeMissingFields,
  IMPORT_FIELD_LABELS,
  IMPORT_FIELDS,
  isImportField,
  missingRequiredFields,
  parseImportMapping,
  REQUIRED_IMPORT_FIELDS,
  suggestMapping,
  toCustomFieldTarget,
  type ImportField,
  type ImportMapping,
} from './mapping/import-fields';
import {
  cleanImportedPhone,
  cleanImportedText,
  parseContactChannel,
  parseContactTime,
  parseImportedAmount,
  parseImportedBudget,
  parsePaymentPreference,
  parsePurchasePurpose,
} from './mapping/import-values';
import {
  detectImportFileType,
  readImportTable,
  type ImportFileType,
  type ImportTable,
  type ImportTableRow,
} from './parsing/import-table.reader';
import {
  ImportDefaults,
  ImportJobErrorEntry,
  ImportJobErrorKind,
  ImportJobOptionsResponse,
  ImportJobResponse,
  ImportPreviewResponse,
  StoredImportJobOptions,
} from './types/import-job.types';

const importJobSelect = {
  id: true,
  status: true,
  totalRows: true,
  processedRows: true,
  successfulRows: true,
  failedRows: true,
  skippedRows: true,
  duplicatePolicy: true,
  options: true,
  errorSummary: true,
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
} satisfies Prisma.ImportJobSelect;

type ImportJobRecord = Prisma.ImportJobGetPayload<{
  select: typeof importJobSelect;
}>;

type ValidatedImportFile = {
  id: string;
  objectKey: string;
  mimeType: string;
  originalFilename: string;
  fileType: ImportFileType;
};

/** Who is importing: decides assignee handling and file visibility. */
export interface ImportActor {
  scope: LeadScope;
  /** Holds lead.assign. */
  canAssign: boolean;
}

type RowOutcome = 'success' | 'failure' | 'skipped';

type ColumnIndexes = Partial<Record<ImportField, number>>;

/** A mapped custom field column. */
interface CustomColumn {
  definition: CustomFieldDefinitionLike;
  index: number;
}

interface JobRunContext {
  jobId: string;
  tenantId: string;
  userId: string;
  duplicatePolicy: ImportDuplicatePolicy;
  columns: ColumnIndexes;
  customColumns: CustomColumn[];
  /** Every lead field definition (validation keeps the stored-value rules). */
  customFieldDefinitions: CustomFieldDefinitionLike[];
  defaults: ImportDefaults;
  canAssign: boolean;
  placement: DefaultPipelinePlacement;
  lookups: ImportLookups;
}

/** Row errors and duplicates, each capped separately. */
class RowReport {
  readonly entries: ImportJobErrorEntry[] = [];
  private errors = 0;
  private duplicates = 0;

  add(row: number, reason: string, kind: ImportJobErrorKind): void {
    if (kind === 'duplicate') {
      if (this.duplicates >= MAX_DUPLICATE_SUMMARY_ENTRIES) return;
      this.duplicates += 1;
    } else {
      if (this.errors >= MAX_ERROR_SUMMARY_ENTRIES) return;
      this.errors += 1;
    }
    this.entries.push({ row, reason, kind });
  }
}

function importOwnerWhere(scope: LeadScope): { createdByUserId?: string } {
  return scope.kind === 'all' || scope.actorUserId === null
    ? {}
    : { createdByUserId: scope.actorUserId };
}

/**
 * Import files hold bulk lead data: without whole-organization visibility
 * people can only preview/import files they uploaded themselves.
 */
function fileOwnerWhere(scope: LeadScope): { uploadedByUserId?: string } {
  return scope.kind === 'all' || scope.actorUserId === null
    ? {}
    : { uploadedByUserId: scope.actorUserId };
}

function activeDefinitions(
  definitions: CustomFieldDefinitionLike[],
): CustomFieldDefinitionLike[] {
  return definitions.filter((field) => !field.archivedAt);
}

@Injectable()
export class ImportJobsService {
  private readonly logger = new Logger(ImportJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly leadsService: LeadsService,
    private readonly queueService: QueueService,
    private readonly domainEventBus: DomainEventBus,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly tenantAccessService: TenantAccessService,
    private readonly auditWriter: AuditWriterService,
    private readonly customFields: CustomFieldsService,
  ) {}

  /** Headers, a few rows and a suggested column mapping (nothing is saved). */
  async previewImport(
    tenantId: string,
    fileAssetId: string,
    actor: ImportActor,
  ): Promise<ImportPreviewResponse> {
    const file = await this.validateImportFile(
      fileAssetId,
      tenantId,
      fileOwnerWhere(actor.scope),
    );
    const table = await this.readFile(file);
    const customFields = activeDefinitions(
      await this.customFields.getLeadDefinitions(tenantId),
    );
    const suggestedMapping = suggestMapping(table.headers, customFields);
    if (!actor.canAssign) {
      for (const [header, field] of Object.entries(suggestedMapping)) {
        if (field === 'assignee') suggestedMapping[header] = null;
      }
    }

    return {
      fileAssetId: file.id,
      fileName: file.originalFilename,
      fileType: table.fileType,
      headers: table.headers,
      sampleRows: table.rows
        .slice(0, IMPORT_PREVIEW_ROWS)
        .map((row) => row.values),
      totalRows: table.rows.length,
      suggestedMapping,
      fields: [
        ...IMPORT_FIELDS.filter(
          (key) => actor.canAssign || key !== 'assignee',
        ).map((key) => ({
          key,
          label: IMPORT_FIELD_LABELS[key],
          required: REQUIRED_IMPORT_FIELDS.includes(key),
          custom: false,
        })),
        // Required custom fields need not be mapped: an unmapped column never
        // blocks a row, a mapped one must have a value.
        ...customFields.map((field) => ({
          key: toCustomFieldTarget(field.key),
          label: field.label,
          required: false,
          custom: true,
        })),
      ],
    };
  }

  async createLeadImportJob(
    tenantId: string,
    userId: string,
    dto: CreateLeadImportJobDto,
    actor: ImportActor,
  ): Promise<ImportJobResponse> {
    const file = await this.validateImportFile(
      dto.fileAssetId,
      tenantId,
      fileOwnerWhere(actor.scope),
    );

    let mapping: ImportMapping | null = null;
    if (dto.mapping !== undefined && dto.mapping !== null) {
      mapping = parseImportMapping(dto.mapping);
      // Assignment is a manager's call: without lead.assign the column is
      // simply not imported.
      if (!actor.canAssign) {
        for (const [header, field] of Object.entries(mapping)) {
          if (field === 'assignee') mapping[header] = null;
        }
      }
      await this.assertCustomFieldTargets(tenantId, mapping);
    }

    const defaults = await this.validateDefaults(tenantId, dto.defaults, actor);
    const duplicatePolicy = dto.duplicatePolicy ?? ImportDuplicatePolicy.SKIP;
    const options: StoredImportJobOptions = {
      version: IMPORT_OPTIONS_VERSION,
      mapping,
      defaults,
      canAssign: actor.canAssign,
      scope: toStoredLeadScope(actor.scope),
    };

    const job = await this.prisma.importJob.create({
      data: {
        tenantId,
        createdByUserId: userId,
        fileAssetId: file.id,
        status: JobStatus.PENDING,
        duplicatePolicy,
        options: options as unknown as Prisma.InputJsonValue,
      },
      select: importJobSelect,
    });

    await this.queueService.enqueueImportJob(job.id);

    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId: userId,
      action: IMPORT_AUDIT_ACTIONS.STARTED,
      entityType: AUDIT_ENTITY_TYPES.IMPORT_JOB,
      entityId: job.id,
      metadata: {
        duplicatePolicy,
        mapping: mapping ? 'manual' : 'auto',
      },
    });

    return this.toImportJobResponse(job);
  }

  /**
   * `isRetry`: a previous worker attempt crashed mid-file, so the job is
   * still PROCESSING; it is claimed again and rows the first attempt already
   * imported come back as already-created (importJobId + importRowNumber).
   */
  async processImportJob(
    jobId: string,
    options: { isRetry?: boolean } = {},
  ): Promise<void> {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        tenantId: true,
        createdByUserId: true,
        fileAssetId: true,
        duplicatePolicy: true,
        options: true,
      },
    });

    if (!job) {
      throw new NotFoundException(`Import job ${jobId} not found`);
    }

    if (
      job.status === JobStatus.COMPLETED ||
      job.status === JobStatus.FAILED ||
      job.status === JobStatus.PARTIAL_SUCCESS
    ) {
      return;
    }

    try {
      await this.tenantAccessService.assertTenantAccessible(job.tenantId);
      // A job queued before the contract went read-only must not write.
      const access = await this.tenantAccessService.getTenantAccessState(
        job.tenantId,
      );
      if (access.readOnly) {
        await this.failImportJobIfActive(
          job.id,
          'This workspace is read-only because its contract ended; the import was not run.',
        );
        return;
      }
    } catch (error) {
      if (error instanceof TenantInactiveException) {
        await this.failImportJobIfActive(job.id, error.message);
        return;
      }

      throw error;
    }

    const claimed = await this.claimImportJob(job.id, options.isRetry === true);
    if (!claimed) {
      this.logger.log(
        `Import job ${jobId} was not claimed (already processing or completed)`,
      );
      return;
    }

    await this.processLeadImportJob(job);
  }

  async failImportJobIfActive(
    jobId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.importJob.updateMany({
      where: {
        id: jobId,
        status: { in: [JobStatus.PENDING, JobStatus.PROCESSING] },
      },
      data: {
        status: JobStatus.FAILED,
        completedAt: new Date(),
        errorSummary: [{ row: 0, reason: errorMessage }],
      },
    });
  }

  async getImportJob(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<ImportJobResponse> {
    const job = await this.getImportJobOrThrow(id, tenantId, scope);
    return this.toImportJobResponse(job);
  }

  async listImportJobs(
    tenantId: string,
    query: GetImportJobsQueryDto,
    scope: LeadScope,
  ): Promise<PaginatedResponse<ImportJobResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    // Imports carry lead names and phones in their error rows: without
    // whole-organization visibility people only see their own imports.
    const where = { tenantId, ...importOwnerWhere(scope) };

    const [jobs, totalItems] = await this.prisma.$transaction([
      this.prisma.importJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: importJobSelect,
        skip,
        take,
      }),
      this.prisma.importJob.count({ where }),
    ]);

    return buildPaginatedResponse(
      jobs.map((job) => this.toImportJobResponse(job)),
      page,
      limit,
      totalItems,
    );
  }

  private async claimImportJob(
    jobId: string,
    isRetry: boolean,
  ): Promise<boolean> {
    const result = await this.prisma.importJob.updateMany({
      where: {
        id: jobId,
        status: isRetry
          ? { in: [JobStatus.PENDING, JobStatus.PROCESSING] }
          : JobStatus.PENDING,
      },
      data: { status: JobStatus.PROCESSING },
    });

    return result.count === 1;
  }

  private async processLeadImportJob(job: {
    id: string;
    tenantId: string;
    createdByUserId: string;
    fileAssetId: string;
    duplicatePolicy: ImportDuplicatePolicy;
    options: Prisma.JsonValue;
  }): Promise<void> {
    const { id: jobId, tenantId, createdByUserId: userId } = job;
    const report = new RowReport();
    const counts = { successfulRows: 0, failedRows: 0, skippedRows: 0 };
    let totalRows = 0;

    try {
      const options = this.parseStoredOptions(job.options);
      const file = await this.validateImportFile(job.fileAssetId, tenantId);
      const table = await this.readFile(file);
      totalRows = table.rows.length;

      const customFieldDefinitions =
        await this.customFields.getLeadDefinitions(tenantId);
      const mapping =
        options.mapping ??
        suggestMapping(
          table.headers,
          activeDefinitions(customFieldDefinitions),
        );
      const columns = this.resolveColumns(table, mapping);
      if (!options.canAssign) delete columns.assignee;
      const customColumns = this.resolveCustomColumns(
        jobId,
        table,
        mapping,
        customFieldDefinitions,
      );

      const [placement, lookups] = await Promise.all([
        this.resolvePlacement(tenantId, options.defaults),
        ImportLookups.load(this.prisma, tenantId, {
          scope: options.scope,
          includeUsers: options.canAssign && columns.assignee !== undefined,
        }),
      ]);

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows },
      });

      const context: JobRunContext = {
        jobId,
        tenantId,
        userId,
        duplicatePolicy: job.duplicatePolicy,
        columns,
        customColumns,
        customFieldDefinitions,
        defaults: options.canAssign
          ? options.defaults
          : { ...options.defaults, assignedUserId: undefined },
        canAssign: options.canAssign,
        placement,
        lookups,
      };

      let processedRows = 0;

      for (const row of table.rows) {
        const outcome = await this.processRow(context, row, report);

        if (outcome === 'success') counts.successfulRows += 1;
        else if (outcome === 'skipped') counts.skippedRows += 1;
        else counts.failedRows += 1;

        processedRows += 1;

        if (
          processedRows % PROGRESS_UPDATE_BATCH_SIZE === 0 ||
          processedRows === totalRows
        ) {
          await this.persistProgress(jobId, {
            processedRows,
            ...counts,
            errors: report.entries,
          });
        }
      }

      await this.finalizeJob(jobId, tenantId, userId, {
        totalRows,
        ...counts,
        errors: report.entries,
      });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'Import failed';
      report.add(0, reason, 'error');

      await this.finalizeJob(jobId, tenantId, userId, {
        totalRows,
        ...counts,
        errors: report.entries,
        catastrophic: true,
      });
    }
  }

  private async validateImportFile(
    fileAssetId: string,
    tenantId: string,
    ownerWhere: { uploadedByUserId?: string } = {},
  ): Promise<ValidatedImportFile> {
    const file = await this.prisma.fileAsset.findFirst({
      where: {
        id: fileAssetId,
        tenantId,
        deletedAt: null,
        ...ownerWhere,
      },
      select: {
        id: true,
        category: true,
        objectKey: true,
        mimeType: true,
        originalFilename: true,
        sizeBytes: true,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.category !== FileAssetCategory.IMPORT_FILE) {
      throw new BadRequestException(
        'File must have category IMPORT_FILE for lead import',
      );
    }

    if (
      file.sizeBytes !== undefined &&
      file.sizeBytes !== null &&
      Number(file.sizeBytes) > MAX_UPLOAD_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException(this.fileTooLargeMessage());
    }

    const originalFilename = file.originalFilename ?? '';
    const fileType = detectImportFileType(
      originalFilename,
      file.mimeType ?? '',
    );
    if (!fileType) {
      throw new BadRequestException('Upload a .csv or .xlsx file');
    }

    return {
      id: file.id,
      objectKey: file.objectKey,
      mimeType: file.mimeType,
      originalFilename,
      fileType,
    };
  }

  private fileTooLargeMessage(): string {
    const megabytes = Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024));
    return `The file is larger than ${megabytes} MB`;
  }

  private async readFile(
    file: ValidatedImportFile,
  ): Promise<ImportTable & { fileType: ImportFileType }> {
    const buffer = await this.storageService.getObject(file.objectKey);
    // The stored size is client-declared at upload: check the real bytes too.
    if (buffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new BadRequestException(this.fileTooLargeMessage());
    }
    return readImportTable(buffer, file.fileType, {
      maxRows: MAX_IMPORT_ROWS,
      maxColumns: MAX_IMPORT_COLUMNS,
    });
  }

  /** Field → column index, from the stored mapping or the headers. */
  private resolveColumns(
    table: ImportTable,
    mapping: ImportMapping,
  ): ColumnIndexes {
    const missing = missingRequiredFields(mapping);
    if (missing.length > 0) {
      throw new BadRequestException(
        `The file has no column for: ${describeMissingFields(missing)}`,
      );
    }

    const columns: ColumnIndexes = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (!isImportField(field)) continue;
      const index = table.headers.indexOf(header);
      if (index === -1) {
        throw new BadRequestException(
          `Column "${header}" (${IMPORT_FIELD_LABELS[field]}) is not in the file`,
        );
      }
      columns[field] = index;
    }
    return columns;
  }

  /**
   * Mapped custom field columns. A field archived (or removed) since the
   * job was created is skipped: its values could not be written anyway.
   */
  private resolveCustomColumns(
    jobId: string,
    table: ImportTable,
    mapping: ImportMapping,
    definitions: CustomFieldDefinitionLike[],
  ): CustomColumn[] {
    const byKey = new Map(definitions.map((field) => [field.key, field]));
    const columns: CustomColumn[] = [];

    for (const [key, header] of Object.entries(customFieldColumns(mapping))) {
      const definition = byKey.get(key);
      if (!definition || definition.archivedAt) {
        this.logger.warn(
          `Import job ${jobId}: custom field "${key}" is no longer active; column "${header}" skipped`,
        );
        continue;
      }
      const index = table.headers.indexOf(header);
      if (index === -1) {
        throw new BadRequestException(
          `Column "${header}" (${definition.label}) is not in the file`,
        );
      }
      columns.push({ definition, index });
    }
    return columns;
  }

  /** Every custom field a mapping targets must exist and be active. */
  private async assertCustomFieldTargets(
    tenantId: string,
    mapping: ImportMapping,
  ): Promise<void> {
    const targets = customFieldColumns(mapping);
    if (Object.keys(targets).length === 0) return;

    const active = new Set(
      activeDefinitions(
        await this.customFields.getLeadDefinitions(tenantId),
      ).map((field) => field.key),
    );
    for (const [key, header] of Object.entries(targets)) {
      if (!active.has(key)) {
        throw new BadRequestException(
          `Column "${header}" is mapped to a custom field that does not exist or is archived`,
        );
      }
    }
  }

  /** Every default must belong to the tenant (assignee: and the scope). */
  private async validateDefaults(
    tenantId: string,
    dto: ImportDefaultsDto | undefined,
    actor: ImportActor,
  ): Promise<ImportDefaults> {
    if (!dto) return {};

    const defaults: ImportDefaults = {};

    if (dto.sourceId) {
      const source = await this.prisma.leadSource.findFirst({
        where: { id: dto.sourceId, tenantId },
        select: { id: true },
      });
      if (!source) throw new BadRequestException('Source not found');
      defaults.sourceId = source.id;
    }

    if (dto.pipelineStageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: dto.pipelineStageId,
          pipeline: { tenantId },
          ...(dto.pipelineId ? { pipelineId: dto.pipelineId } : {}),
        },
        select: { id: true, pipelineId: true, isClosed: true },
      });
      if (!stage) {
        throw new BadRequestException(
          dto.pipelineId
            ? 'That stage does not belong to the selected pipeline'
            : 'Pipeline stage not found',
        );
      }
      if (stage.isClosed) {
        throw new BadRequestException(
          'Imported leads cannot start in a closed stage',
        );
      }
      defaults.pipelineId = stage.pipelineId;
      defaults.pipelineStageId = stage.id;
    } else if (dto.pipelineId) {
      const pipeline = await this.prisma.pipeline.findFirst({
        where: { id: dto.pipelineId, tenantId },
        select: {
          id: true,
          stages: {
            where: { isClosed: false },
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { id: true },
          },
        },
      });
      if (!pipeline) throw new BadRequestException('Pipeline not found');
      if (pipeline.stages.length === 0) {
        throw new BadRequestException('That pipeline has no open stage');
      }
      defaults.pipelineId = pipeline.id;
      defaults.pipelineStageId = pipeline.stages[0].id;
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new BadRequestException('Project not found');
      defaults.projectId = project.id;
    }

    if (dto.assignedUserId) {
      if (!actor.canAssign) {
        throw new ForbiddenException(
          'You do not have permission to assign leads',
        );
      }
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.assignedUserId,
          tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!user || !isAssigneeInScope(actor.scope, user.id)) {
        throw new BadRequestException('Assigned user not found');
      }
      defaults.assignedUserId = user.id;
    }

    return defaults;
  }

  /** The chosen stage if it still exists and is open, else the default. */
  private async resolvePlacement(
    tenantId: string,
    defaults: ImportDefaults,
  ): Promise<DefaultPipelinePlacement> {
    if (defaults.pipelineId && defaults.pipelineStageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: defaults.pipelineStageId,
          pipelineId: defaults.pipelineId,
          pipeline: { tenantId },
          isClosed: false,
        },
        select: { id: true },
      });
      if (stage) {
        return {
          pipelineId: defaults.pipelineId,
          pipelineStageId: stage.id,
        };
      }
    }

    return this.leadsService.getDefaultPipelinePlacement(tenantId);
  }

  private parseStoredOptions(value: Prisma.JsonValue): {
    mapping: ImportMapping | null;
    defaults: ImportDefaults;
    canAssign: boolean;
    scope: LeadScope;
  } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      // Jobs created before the wizard: auto-match, no defaults, and the
      // assignee column behaves as it did (tenant-wide, honoured).
      return {
        mapping: null,
        defaults: {},
        canAssign: true,
        scope: parseStoredLeadScope(null),
      };
    }

    const stored = value as unknown as Partial<StoredImportJobOptions>;
    return {
      mapping: stored.mapping ?? null,
      defaults: stored.defaults ?? {},
      canAssign: stored.canAssign === true,
      scope: parseStoredLeadScope(stored.scope),
    };
  }

  private async persistProgress(
    jobId: string,
    params: {
      processedRows: number;
      successfulRows: number;
      failedRows: number;
      skippedRows: number;
      errors: ImportJobErrorEntry[];
    },
  ): Promise<void> {
    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        processedRows: params.processedRows,
        successfulRows: params.successfulRows,
        failedRows: params.failedRows,
        skippedRows: params.skippedRows,
        ...(params.errors.length > 0
          ? {
              errorSummary: params.errors as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }

  private buildRow(
    context: JobRunContext,
    row: ImportTableRow,
  ):
    | { input: SystemLeadInput; metadata: Record<string, string> }
    | { error: string } {
    const cell = (field: ImportField): string => {
      const index = context.columns[field];
      return index === undefined ? '' : (row.values[index] ?? '').trim();
    };

    const fullName = cleanImportedText(cell('fullName'), 200);
    if (!fullName) return { error: 'Missing name' };
    const primaryPhone = cleanImportedPhone(cell('primaryPhone'));
    if (!primaryPhone) return { error: 'Missing phone' };

    const sourceName = cell('source');
    const sourceId =
      (sourceName ? context.lookups.resolveSourceId(sourceName) : null) ??
      context.defaults.sourceId ??
      null;

    const assigneeValue = context.canAssign ? cell('assignee') : '';
    const assignedUserId =
      (assigneeValue
        ? context.lookups.resolveAssigneeId(assigneeValue)
        : null) ??
      context.defaults.assignedUserId ??
      null;

    const projectIds = [
      ...new Set([
        ...context.lookups.resolveProjectIds(cell('project')),
        ...(context.defaults.projectId ? [context.defaults.projectId] : []),
      ]),
    ];

    const secondaryPhone = cleanImportedPhone(cell('secondaryPhone'));
    const notes = cell('notes');

    const customFields = this.buildCustomFields(context, row);
    if ('error' in customFields) return customFields;

    // Names that matched nothing stay on the timeline instead of vanishing.
    const metadata: Record<string, string> = {};
    if (sourceName && !context.lookups.resolveSourceId(sourceName)) {
      metadata.submittedSource = cleanImportedText(sourceName, 200) ?? '';
    }
    const unknownProjects = context.lookups.unknownProjectNames(
      cell('project'),
    );
    if (unknownProjects.length > 0) {
      metadata.submittedProject =
        cleanImportedText(unknownProjects.join(', '), 500) ?? '';
    }

    return {
      input: {
        fullName,
        primaryPhone,
        secondaryPhone: secondaryPhone || null,
        email: cell('email') || null,
        sourceId,
        assignedUserId,
        projectIds,
        message: notes || null,
        profile: this.buildProfile(cell),
        customFields: customFields.values,
      },
      metadata,
    };
  }

  /**
   * Mapped custom field cells, validated like a lead form: a bad value fails
   * the row with the field's message; a required field whose column is
   * mapped must not be blank.
   */
  private buildCustomFields(
    context: JobRunContext,
    row: ImportTableRow,
  ): { values: Record<string, unknown> } | { error: string } {
    if (context.customColumns.length === 0) return { values: {} };

    const submitted: Record<string, unknown> = {};
    for (const { definition, index } of context.customColumns) {
      submitted[definition.key] = importedCustomFieldValue(
        definition,
        row.values[index] ?? '',
      );
    }

    try {
      return {
        values: mergeCustomFieldValues({
          definitions: context.customFieldDefinitions,
          existing: null,
          submitted,
          required: 'submitted',
        }),
      };
    } catch (error) {
      if (error instanceof CustomFieldValidationError) {
        return { error: error.message };
      }
      throw error;
    }
  }

  /** Unknown option values and unreadable amounts are ignored, not fatal. */
  private buildProfile(
    cell: (field: ImportField) => string,
  ): ImportLeadProfile {
    const range = parseImportedBudget(cell('budget'));
    let budgetMin = parseImportedAmount(cell('budgetMin')) ?? range.min;
    let budgetMax = parseImportedAmount(cell('budgetMax')) ?? range.max;
    if (
      budgetMin !== undefined &&
      budgetMax !== undefined &&
      budgetMin > budgetMax
    ) {
      [budgetMin, budgetMax] = [budgetMax, budgetMin];
    }

    return {
      occupation: cleanImportedText(cell('occupation')),
      residenceArea: cleanImportedText(cell('residenceArea')),
      paymentPreference: parsePaymentPreference(cell('paymentPreference')),
      contactChannelPreference: parseContactChannel(
        cell('contactChannelPreference'),
      ),
      contactTimePreference: parseContactTime(cell('contactTimePreference')),
      purchasePurpose: parsePurchasePurpose(cell('purchasePurpose')),
      budgetMin,
      budgetMax,
    };
  }

  private async processRow(
    context: JobRunContext,
    row: ImportTableRow,
    report: RowReport,
  ): Promise<RowOutcome> {
    const built = this.buildRow(context, row);
    if ('error' in built) {
      report.add(row.line, built.error, 'error');
      return 'failure';
    }

    const result = await this.leadsService.createSystemLead(
      context.tenantId,
      built.input,
      context.placement,
      {
        origin: 'import',
        actorUserId: context.userId,
        importJobId: context.jobId,
        importRowNumber: row.line,
        duplicatePolicy: context.duplicatePolicy,
        ...(Object.keys(built.metadata).length > 0 && {
          metadata: built.metadata,
        }),
      },
    );

    switch (result.status) {
      case 'created':
      case 'already-created':
        return 'success';
      case 'duplicate':
        report.add(
          row.line,
          'A lead with this phone number already exists',
          'duplicate',
        );
        return 'skipped';
      case 'failed':
        report.add(row.line, result.reason, 'error');
        return 'failure';
    }
  }

  private async finalizeJob(
    jobId: string,
    tenantId: string,
    createdByUserId: string,
    params: {
      totalRows: number;
      successfulRows: number;
      failedRows: number;
      skippedRows: number;
      errors: ImportJobErrorEntry[];
      catastrophic?: boolean;
    },
  ): Promise<void> {
    const status = this.resolveFinalStatus(params);

    await this.prisma.importJob.update({
      where: { id: jobId },
      data: {
        status,
        totalRows: params.totalRows,
        processedRows:
          params.successfulRows + params.failedRows + params.skippedRows,
        successfulRows: params.successfulRows,
        failedRows: params.failedRows,
        skippedRows: params.skippedRows,
        errorSummary:
          params.errors.length > 0
            ? (params.errors as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        completedAt: new Date(),
      },
    });

    await this.auditWriter.createAuditLog({
      tenantId,
      actorType: AuditActorType.SYSTEM,
      actorUserId: null,
      action: IMPORT_AUDIT_ACTIONS.COMPLETED,
      entityType: AUDIT_ENTITY_TYPES.IMPORT_JOB,
      entityId: jobId,
      metadata: {
        totalRows: params.totalRows,
        successfulRows: params.successfulRows,
        failedRows: params.failedRows,
        skippedRows: params.skippedRows,
        status,
      },
    });

    void this.domainEventBus.publish(new ImportCompletedEvent(tenantId, jobId));

    if (
      status === JobStatus.COMPLETED ||
      status === JobStatus.PARTIAL_SUCCESS
    ) {
      void this.notificationTrigger.notifyImportCompleted({
        tenantId,
        recipientUserId: createdByUserId,
        importJobId: jobId,
        successfulRows: params.successfulRows,
        failedRows: params.failedRows,
      });
    }
  }

  /** Skipped duplicates are not failures: all-skipped is still COMPLETED. */
  private resolveFinalStatus(params: {
    successfulRows: number;
    failedRows: number;
    catastrophic?: boolean;
  }): JobStatus {
    if (params.catastrophic) {
      return JobStatus.FAILED;
    }

    if (params.failedRows === 0) {
      return JobStatus.COMPLETED;
    }

    if (params.successfulRows === 0) {
      return JobStatus.FAILED;
    }

    return JobStatus.PARTIAL_SUCCESS;
  }

  private async getImportJobOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<ImportJobRecord> {
    const job = await this.prisma.importJob.findFirst({
      where: { id, tenantId, ...importOwnerWhere(scope) },
      select: importJobSelect,
    });

    if (!job) {
      throw new NotFoundException('Import job not found');
    }

    return job;
  }

  private toImportJobResponse(job: ImportJobRecord): ImportJobResponse {
    return {
      id: job.id,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      successfulRows: job.successfulRows,
      failedRows: job.failedRows,
      skippedRows: job.skippedRows ?? 0,
      duplicatePolicy: job.duplicatePolicy ?? ImportDuplicatePolicy.SKIP,
      options: this.toOptionsResponse(job.options),
      errorSummary: this.parseErrorSummary(job.errorSummary),
      fileAsset: job.fileAsset,
      createdBy: job.createdBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
    };
  }

  private toOptionsResponse(
    value: ImportJob['options'] | undefined,
  ): ImportJobOptionsResponse | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const stored = value as unknown as Partial<StoredImportJobOptions>;
    return {
      mapping: stored.mapping ?? null,
      defaults: stored.defaults ?? {},
    };
  }

  private parseErrorSummary(
    value: ImportJob['errorSummary'],
  ): ImportJobErrorEntry[] | null {
    if (!value || !Array.isArray(value)) {
      return null;
    }

    return value as unknown as ImportJobErrorEntry[];
  }
}
