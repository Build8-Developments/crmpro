import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditActorType,
  CustomFieldEntity,
  CustomFieldType,
  FileAssetCategory,
  ImportDuplicatePolicy,
  ImportJob,
  JobStatus,
  Prisma,
} from '@crmpro/database';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  TenantInactiveException,
  TenantStatusService,
} from '../../common/tenant/tenant-status.service';
import { StorageService } from '../../common/storage/storage.service';
import { LeadsService } from '../leads/leads.service';
import {
  CustomFieldValidationError,
  mergeCustomFieldValues,
  type FieldDefinitionLike,
} from '../custom-fields/custom-field-values';
import { LeadDistributionService } from '../lead-distribution/lead-distribution.service';
import {
  isAssigneeInScope,
  parseStoredLeadScope,
  SYSTEM_LEAD_SCOPE,
  toStoredLeadScope,
  type LeadScope,
} from '../leads/scope/lead-scope.types';
import type { DefaultPipelinePlacement } from '../leads/types/lead.types';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { ImportCompletedEvent } from '../../common/events/domain-event.types';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { QueueService } from '../jobs/queues/queue.service';
import {
  AUDIT_ENTITY_TYPES,
  IMPORT_AUDIT_ACTIONS,
} from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';
import {
  CreateLeadImportJobDto,
  ImportDefaultsDto,
} from './dto/create-lead-import-job.dto';
import { GetImportJobsQueryDto } from './dto/get-import-jobs-query.dto';
import { ImportLookups } from './import-lookups';
import {
  IMPORT_PREVIEW_ROWS,
  MAX_ERROR_SUMMARY_ENTRIES,
  MAX_IMPORT_ROWS,
  PROGRESS_UPDATE_BATCH_SIZE,
} from './import-jobs.constants';
import {
  CORE_IMPORT_FIELD_LABELS,
  CORE_IMPORT_FIELDS,
  CUSTOM_FIELD_MAPPING_PREFIX,
  missingRequiredFields,
  parseImportMapping,
  REQUIRED_IMPORT_FIELDS,
  suggestMapping,
  type ImportMapping,
} from './mapping/import-fields';
import {
  cleanImportedPhone,
  normalizeImportedDate,
  parseImportedAmount,
  parseImportedBoolean,
  splitImportedList,
  toLatinDigits,
} from './mapping/import-values';
import {
  detectImportFileKind,
  readImportTable,
  type ImportFileKind,
  type ImportTable,
  type ImportTableRow,
} from './parsing/import-table.reader';
import {
  ImportDefaults,
  ImportFieldDescriptor,
  ImportJobErrorEntry,
  ImportJobOptions,
  ImportJobResponse,
  ImportPreviewResponse,
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
  kind: ImportFileKind;
};

type ImportCustomField = FieldDefinitionLike;

type RowOutcome = 'success' | 'failure' | 'skipped';

interface JobRunContext {
  jobId: string;
  tenantId: string;
  userId: string;
  duplicatePolicy: ImportDuplicatePolicy;
  mapping: ImportMapping;
  defaults: ImportDefaults;
  placement: DefaultPipelinePlacement;
  customFields: ImportCustomField[];
  countryCode: string;
  lookups: ImportLookups;
  autoAssign: boolean;
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
    private readonly tenantStatusService: TenantStatusService,
    private readonly auditWriter: AuditWriterService,
    private readonly leadDistribution: LeadDistributionService,
  ) {}

  /** Headers, a few rows and a suggested column mapping for the wizard. */
  async previewImport(
    tenantId: string,
    userId: string,
    fileAssetId: string,
    permissionKeys: ReadonlySet<PermissionKey>,
  ): Promise<ImportPreviewResponse> {
    const file = await this.validateImportFile(
      fileAssetId,
      tenantId,
      this.fileOwnerFilter(userId, permissionKeys),
    );
    const [table, customFields] = await Promise.all([
      this.readFile(file),
      this.loadCustomFields(tenantId),
    ]);

    return {
      fileAssetId: file.id,
      fileName: file.originalFilename,
      fileKind: file.kind,
      headers: table.headers,
      sampleRows: table.rows
        .slice(0, IMPORT_PREVIEW_ROWS)
        .map((row) => row.values),
      totalRows: table.rows.length,
      suggestedMapping: suggestMapping(table.headers, customFields),
      fields: this.describeFields(customFields),
    };
  }

  async createLeadImportJob(
    tenantId: string,
    userId: string,
    dto: CreateLeadImportJobDto,
    permissionKeys: ReadonlySet<PermissionKey>,
    scope: LeadScope,
  ): Promise<ImportJobResponse> {
    const file = await this.validateImportFile(
      dto.fileAssetId,
      tenantId,
      this.fileOwnerFilter(userId, permissionKeys),
    );

    let mapping: ImportMapping | null = null;
    if (dto.mapping !== undefined) {
      const customFields = await this.loadCustomFields(tenantId);
      mapping = parseImportMapping(
        dto.mapping,
        new Set(customFields.map((field) => field.key)),
      );
    }

    const assigns =
      dto.defaults?.assignedUserId !== undefined ||
      (mapping !== null && 'assignee' in mapping);
    if (assigns && !permissionKeys.has(PERMISSIONS.LEAD_ASSIGN)) {
      throw new BadRequestException(
        'You do not have permission to assign leads during import',
      );
    }

    const defaults = await this.validateDefaults(tenantId, dto.defaults, scope);
    const options: ImportJobOptions = {
      mapping,
      defaults,
      scope: toStoredLeadScope(scope),
    };

    const job = await this.prisma.importJob.create({
      data: {
        tenantId,
        createdByUserId: userId,
        fileAssetId: file.id,
        status: JobStatus.PENDING,
        duplicatePolicy: dto.duplicatePolicy ?? ImportDuplicatePolicy.SKIP,
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
        duplicatePolicy: job.duplicatePolicy,
        mappedFields: mapping ? Object.keys(mapping) : 'auto',
      },
    });

    return this.toImportJobResponse(job);
  }

  /**
   * `isRetry`: a previous attempt crashed mid-file. The job is still
   * PROCESSING; it is picked up again and rows the first attempt imported are
   * skipped (Lead.importJobId + importRowNumber is unique).
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
      await this.tenantStatusService.assertTenantActive(job.tenantId);
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

  /**
   * `ownerUserId` restricts results to jobs the user created. Import files and
   * row errors contain bulk lead data, so only tenant-wide (lead.read-all)
   * users see everyone's imports.
   */
  async getImportJob(
    id: string,
    tenantId: string,
    ownerUserId: string | null,
  ): Promise<ImportJobResponse> {
    const job = await this.getImportJobOrThrow(id, tenantId, ownerUserId);
    return this.toImportJobResponse(job);
  }

  async listImportJobs(
    tenantId: string,
    query: GetImportJobsQueryDto,
    ownerUserId: string | null,
  ): Promise<PaginatedResponse<ImportJobResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = {
      tenantId,
      ...(ownerUserId ? { createdByUserId: ownerUserId } : {}),
    };

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
    const errors: ImportJobErrorEntry[] = [];
    const counts = { successfulRows: 0, failedRows: 0, skippedRows: 0 };
    let totalRows = 0;

    try {
      const options = this.parseJobOptions(job.options);
      const file = await this.validateImportFile(job.fileAssetId, tenantId);
      const [table, customFields, settings] = await Promise.all([
        this.readFile(file),
        this.loadCustomFields(tenantId),
        this.prisma.tenantSettings.findUnique({
          where: { tenantId },
          select: { defaultCountryCode: true, autoAssignEnabled: true },
        }),
      ]);
      totalRows = table.rows.length;

      const mapping = this.resolveMapping(table, options.mapping, customFields);
      const [placement, lookups, imported] = await Promise.all([
        this.resolvePlacement(tenantId, options.defaults),
        ImportLookups.load(this.prisma, tenantId, options.scopeResolved),
        this.prisma.lead.findMany({
          where: { importJobId: jobId },
          select: { importRowNumber: true },
        }),
      ]);
      const alreadyImported = new Set(
        imported.map((lead) => lead.importRowNumber),
      );

      await this.prisma.importJob.update({
        where: { id: jobId },
        data: { totalRows },
      });

      const context: JobRunContext = {
        jobId,
        tenantId,
        userId,
        duplicatePolicy: job.duplicatePolicy,
        mapping,
        defaults: options.defaults,
        placement,
        customFields,
        countryCode: settings?.defaultCountryCode ?? 'EG',
        lookups,
        autoAssign: settings?.autoAssignEnabled ?? false,
      };

      let processedRows = 0;

      for (const row of table.rows) {
        const outcome = alreadyImported.has(row.line)
          ? 'success'
          : await this.processRow(context, row, errors);

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
            errors,
          });
        }
      }

      await this.finalizeJob(jobId, tenantId, userId, {
        totalRows,
        ...counts,
        errors,
      });
    } catch (error: unknown) {
      const reason =
        error instanceof BadRequestException
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Import failed';

      if (errors.length < MAX_ERROR_SUMMARY_ENTRIES) {
        errors.push({ row: 0, reason });
      }

      await this.finalizeJob(jobId, tenantId, userId, {
        totalRows,
        ...counts,
        errors,
        catastrophic: true,
      });
    }
  }

  private async validateImportFile(
    fileAssetId: string,
    tenantId: string,
    uploadedByUserId: string | null = null,
  ): Promise<ValidatedImportFile> {
    const file = await this.prisma.fileAsset.findFirst({
      where: {
        id: fileAssetId,
        tenantId,
        deletedAt: null,
        ...(uploadedByUserId ? { uploadedByUserId } : {}),
      },
      select: {
        id: true,
        category: true,
        objectKey: true,
        mimeType: true,
        originalFilename: true,
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

    const kind = detectImportFileKind(
      file.originalFilename ?? '',
      file.mimeType ?? '',
    );

    if (!kind) {
      throw new BadRequestException('Upload a .csv or .xlsx file');
    }

    return { ...file, kind };
  }

  /** Import files hold bulk lead data: only the uploader (or read-all) may use them. */
  private fileOwnerFilter(
    userId: string,
    permissionKeys: ReadonlySet<PermissionKey>,
  ): string | null {
    return permissionKeys.has(PERMISSIONS.LEAD_READ_ALL) ? null : userId;
  }

  private async readFile(file: ValidatedImportFile): Promise<ImportTable> {
    const buffer = await this.storageService.getObject(file.objectKey);
    return readImportTable(buffer, file.kind, { maxRows: MAX_IMPORT_ROWS });
  }

  private async loadCustomFields(
    tenantId: string,
  ): Promise<ImportCustomField[]> {
    return this.prisma.customFieldDefinition.findMany({
      where: { tenantId, entity: CustomFieldEntity.LEAD, archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        key: true,
        label: true,
        type: true,
        options: true,
        isRequired: true,
      },
    });
  }

  private describeFields(
    customFields: ImportCustomField[],
  ): ImportFieldDescriptor[] {
    return [
      ...CORE_IMPORT_FIELDS.map((key) => ({
        key,
        label: CORE_IMPORT_FIELD_LABELS[key],
        required: REQUIRED_IMPORT_FIELDS.includes(key),
        kind: 'core' as const,
      })),
      ...customFields.map((field) => ({
        key: `${CUSTOM_FIELD_MAPPING_PREFIX}${field.key}`,
        label: field.label,
        required: field.isRequired,
        kind: 'custom' as const,
        type: field.type,
        options: Array.isArray(field.options)
          ? (field.options as string[])
          : null,
      })),
    ];
  }

  private resolveMapping(
    table: ImportTable,
    stored: ImportMapping | null,
    customFields: ImportCustomField[],
  ): ImportMapping {
    const mapping = stored ?? suggestMapping(table.headers, customFields);
    const missing = missingRequiredFields(mapping);

    if (missing.length > 0) {
      throw new BadRequestException(
        `The file has no column for: ${missing
          .map(
            (field) =>
              CORE_IMPORT_FIELD_LABELS[
                field as keyof typeof CORE_IMPORT_FIELD_LABELS
              ],
          )
          .join(', ')}`,
      );
    }

    for (const [field, column] of Object.entries(mapping)) {
      if (column >= table.headers.length) {
        throw new BadRequestException(
          `Column ${column + 1} mapped to "${field}" does not exist in the file`,
        );
      }
    }

    return mapping;
  }

  /** Checks that every default belongs to the tenant (and the scope). */
  private async validateDefaults(
    tenantId: string,
    dto: ImportDefaultsDto | undefined,
    scope: LeadScope,
  ): Promise<ImportDefaults> {
    if (!dto) {
      return {};
    }

    const defaults: ImportDefaults = {};

    if (dto.sourceId) {
      const source = await this.prisma.leadSource.findFirst({
        where: { id: dto.sourceId, tenantId },
        select: { id: true },
      });
      if (!source) throw new BadRequestException('Source not found');
      defaults.sourceId = source.id;
    }

    if (dto.stageId || dto.pipelineId) {
      const stage = dto.stageId
        ? await this.prisma.pipelineStage.findFirst({
            where: {
              id: dto.stageId,
              pipeline: { tenantId },
              ...(dto.pipelineId ? { pipelineId: dto.pipelineId } : {}),
            },
            select: { id: true, pipelineId: true },
          })
        : await this.prisma.pipelineStage.findFirst({
            where: { pipelineId: dto.pipelineId, pipeline: { tenantId } },
            orderBy: { sortOrder: 'asc' },
            select: { id: true, pipelineId: true },
          });
      if (!stage) throw new BadRequestException('Pipeline stage not found');
      defaults.pipelineId = stage.pipelineId;
      defaults.stageId = stage.id;
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
      const user = await this.prisma.user.findFirst({
        where: {
          id: dto.assignedUserId,
          tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!user || !isAssigneeInScope(scope, user.id)) {
        throw new BadRequestException('Assigned user not found');
      }
      defaults.assignedUserId = user.id;
    }

    return defaults;
  }

  private async resolvePlacement(
    tenantId: string,
    defaults: ImportDefaults,
  ): Promise<DefaultPipelinePlacement> {
    if (defaults.pipelineId && defaults.stageId) {
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: defaults.stageId,
          pipelineId: defaults.pipelineId,
          pipeline: { tenantId },
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

  private parseJobOptions(
    value: Prisma.JsonValue,
  ): Omit<ImportJobOptions, 'scope'> & { scopeResolved: LeadScope } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      // Jobs created before mappings existed: auto-match, no defaults.
      return { mapping: null, defaults: {}, scopeResolved: SYSTEM_LEAD_SCOPE };
    }

    const stored = value as unknown as Partial<ImportJobOptions>;
    return {
      mapping: stored.mapping ?? null,
      defaults: stored.defaults ?? {},
      scopeResolved: parseStoredLeadScope(stored.scope),
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

  private cell(context: JobRunContext, row: ImportTableRow, field: string) {
    const column = context.mapping[field];
    return column === undefined ? '' : (row.values[column] ?? '').trim();
  }

  private async processRow(
    context: JobRunContext,
    row: ImportTableRow,
    errors: ImportJobErrorEntry[],
  ): Promise<RowOutcome> {
    const fail = (reason: string): RowOutcome => {
      this.pushError(errors, row.line, reason);
      return 'failure';
    };

    const fullName = this.cell(context, row, 'fullName');
    const primaryPhone = cleanImportedPhone(
      this.cell(context, row, 'primaryPhone'),
      context.countryCode,
    );

    if (fullName.length === 0) return fail('Missing name');
    if (primaryPhone.length === 0) return fail('Missing phone');

    const budgetMin = parseImportedAmount(this.cell(context, row, 'budgetMin'));
    const budgetMax = parseImportedAmount(this.cell(context, row, 'budgetMax'));
    if (budgetMin === null || budgetMax === null) {
      return fail('Budget must be a number');
    }
    if (
      budgetMin !== undefined &&
      budgetMax !== undefined &&
      budgetMin > budgetMax
    ) {
      return fail('Budget from is greater than budget to');
    }

    let customFields: Prisma.InputJsonValue | undefined;
    try {
      customFields = this.buildCustomFields(context, row);
    } catch (error) {
      if (error instanceof CustomFieldValidationError) {
        return fail(Object.values(error.errors).join('; '));
      }
      throw error;
    }

    const sourceName = this.cell(context, row, 'source');
    const sourceId =
      (sourceName ? await context.lookups.resolveSourceId(sourceName) : null) ??
      context.defaults.sourceId ??
      null;

    const assigneeValue = this.cell(context, row, 'assignee');
    const assignedUserId =
      (assigneeValue
        ? context.lookups.resolveAssigneeId(assigneeValue)
        : null) ??
      context.defaults.assignedUserId ??
      null;

    const projectIds = [
      ...context.lookups.resolveProjectIds(this.cell(context, row, 'project')),
      ...(context.defaults.projectId ? [context.defaults.projectId] : []),
    ];

    const secondary = this.cell(context, row, 'secondaryPhone');

    const result = await this.leadsService.createLeadFromImport(
      context.tenantId,
      context.userId,
      context.jobId,
      {
        fullName,
        primaryPhone,
        secondaryPhone: secondary
          ? cleanImportedPhone(secondary, context.countryCode)
          : null,
        email: this.cell(context, row, 'email') || null,
        sourceId,
        assignedUserId,
        projectIds,
        budgetMin: budgetMin ?? null,
        budgetMax: budgetMax ?? null,
        notes: this.cell(context, row, 'notes') || null,
        customFields,
        importRowNumber: row.line,
        allowDuplicates:
          context.duplicatePolicy === ImportDuplicatePolicy.CREATE,
      },
      context.placement,
    );

    if (!result.success) {
      if (result.duplicate) {
        this.pushError(errors, row.line, result.reason, 'duplicate');
        return 'skipped';
      }
      return fail(result.reason);
    }

    if (
      context.autoAssign &&
      result.assignedUserId === null &&
      !result.alreadyImported
    ) {
      // Sequential on purpose: keeps the round-robin order stable.
      await this.leadDistribution
        .autoAssignNewLead(context.tenantId, result.leadId)
        .catch((error: Error) =>
          this.logger.warn(
            `Auto-assign failed for imported lead ${result.leadId}: ${error.message}`,
          ),
        );
    }

    return 'success';
  }

  /** Spreadsheet text → typed custom field values (validated). */
  private buildCustomFields(
    context: JobRunContext,
    row: ImportTableRow,
  ): Prisma.InputJsonValue | undefined {
    if (context.customFields.length === 0) {
      return undefined;
    }

    const submitted: Record<string, unknown> = {};

    for (const definition of context.customFields) {
      const raw = this.cell(
        context,
        row,
        `${CUSTOM_FIELD_MAPPING_PREFIX}${definition.key}`,
      );
      if (raw.length === 0) continue;

      const options = Array.isArray(definition.options)
        ? (definition.options as string[])
        : [];
      const matchOption = (value: string) =>
        options.find(
          (option) => option.toLowerCase() === value.trim().toLowerCase(),
        ) ?? value.trim();

      switch (definition.type) {
        case CustomFieldType.NUMBER:
          submitted[definition.key] = toLatinDigits(raw);
          break;
        case CustomFieldType.BOOLEAN:
          submitted[definition.key] = parseImportedBoolean(raw);
          break;
        case CustomFieldType.DATE:
          submitted[definition.key] = normalizeImportedDate(raw);
          break;
        case CustomFieldType.SELECT:
          submitted[definition.key] = matchOption(raw);
          break;
        case CustomFieldType.MULTI_SELECT:
          submitted[definition.key] = splitImportedList(raw).map(matchOption);
          break;
        default:
          submitted[definition.key] = raw;
      }
    }

    const values = mergeCustomFieldValues(
      context.customFields,
      null,
      submitted,
      { creating: true },
    );

    return Object.keys(values).length > 0 ? values : undefined;
  }

  private pushError(
    errors: ImportJobErrorEntry[],
    row: number,
    reason: string,
    kind: ImportJobErrorEntry['kind'] = 'error',
  ): void {
    if (errors.length >= MAX_ERROR_SUMMARY_ENTRIES) {
      return;
    }

    errors.push({ row, reason, kind });
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

  private resolveFinalStatus(params: {
    totalRows: number;
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
    ownerUserId: string | null,
  ): Promise<ImportJobRecord> {
    const job = await this.prisma.importJob.findFirst({
      where: {
        id,
        tenantId,
        ...(ownerUserId ? { createdByUserId: ownerUserId } : {}),
      },
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
      skippedRows: job.skippedRows,
      duplicatePolicy: job.duplicatePolicy,
      errorSummary: this.parseErrorSummary(job.errorSummary),
      fileAsset: job.fileAsset,
      createdBy: job.createdBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
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
