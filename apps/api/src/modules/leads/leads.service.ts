import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadActivityEventType, LeadStatus, Prisma } from '@crmpro/database';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { dayBoundsInZone } from '@crmpro/shared/workflow';
import { isEmail } from 'class-validator';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import {
  type LeadScope,
  SYSTEM_LEAD_SCOPE,
  isAssigneeInScope,
  leadScopeWhere,
} from '../../common/auth';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildOrderBy, normalizeSearch, SortOrder } from '../../common/query';
import { normalizeDisplayName } from '../../common/utils/name-normalization.util';
import {
  normalizePhone,
  phoneSearchCore,
} from '../../common/utils/phone-normalization.util';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import {
  LEAD_PROFILE_KEYS,
  LeadProfileFieldsDto,
} from './dto/lead-profile-fields.dto';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto';
import { ProjectInterestDto } from './dto/project-interest.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { leadSelect, toLeadResponse } from './lead.mapper';
import {
  ASSIGNED_LEAD_WHERE,
  lastContactWhere,
  loadStageThresholdRows,
  nextStepWhere,
  OPEN_LEAD_WHERE,
  slaBreachedWhere,
  stageStaleLeadWhere,
  stuckLeadWhere,
  toStageThresholds,
  UNASSIGNED_OPEN_LEAD_WHERE,
} from './utils/lead-filter-where.util';
import { LeadActivityService } from './services/lead-activity.service';
import { TaskLifecycleService } from '../workflow/common/task-lifecycle.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import {
  LeadCreatedEvent,
  LeadUpdatedEvent,
} from '../../common/events/domain-event.types';
import {
  DefaultPipelinePlacement,
  DuplicateWarning,
  ImportLeadProfile,
  ImportLeadRowInput,
  ImportLeadRowResult,
  SystemLeadInput,
  SystemLeadOptions,
  SystemLeadResult,
  LeadListFilters,
  LeadMutationResult,
  LeadResponse,
} from './types/lead.types';

export const LEAD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'lastContactedAt',
  'nextTaskDueAt',
  'stageEnteredAt',
] as const;

const LEAD_SORT_CONFIG = {
  allowedFields: LEAD_SORT_FIELDS,
  defaultField: 'createdAt' as const,
  defaultOrder: SortOrder.DESC,
};

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
    private readonly domainEventBus: DomainEventBus,
    private readonly quotaService: QuotaService,
    private readonly taskLifecycle: TaskLifecycleService,
    private readonly customFields: CustomFieldsService,
  ) {}

  async listLeads(
    tenantId: string,
    query: GetLeadsQueryDto,
    scope: LeadScope,
  ): Promise<PaginatedResponse<LeadResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where: Prisma.LeadWhereInput = {
      AND: [
        this.buildWhereClause(
          tenantId,
          query,
          await this.loadFilterContext(tenantId, query),
        ),
        leadScopeWhere(scope),
      ],
    };
    const orderBy = this.buildOrderBy(query);

    const [leads, totalItems] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy,
        select: leadSelect,
        skip,
        take,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return buildPaginatedResponse(
      leads.map((lead) => toLeadResponse(lead)),
      page,
      limit,
      totalItems,
    );
  }

  async getLead(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<LeadResponse> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: leadSelect,
    });
    if (lead) return toLeadResponse(lead);

    // A lead merged away still 404s, but says where it went when the caller
    // can see the survivor (so old links and open drawers can follow it).
    const mergedIntoId = await this.findVisibleMergeSurvivor(
      id,
      tenantId,
      scope,
    );
    if (mergedIntoId) {
      throw new NotFoundException({
        code: API_ERROR_CODES.NOT_FOUND,
        message: 'This lead was merged into another lead',
        details: { mergedIntoId },
      });
    }
    throw new NotFoundException('Lead not found');
  }

  private async findVisibleMergeSurvivor(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<string | null> {
    const merged = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: { not: null } },
      select: { mergedIntoId: true },
    });
    if (!merged?.mergedIntoId) return null;

    const survivor = await this.prisma.lead.findFirst({
      where: {
        id: merged.mergedIntoId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: { id: true },
    });
    return survivor?.id ?? null;
  }

  async createLead(
    tenantId: string,
    actorUserId: string,
    dto: CreateLeadDto,
    scope: LeadScope,
  ): Promise<LeadMutationResult> {
    await this.validateSource(dto.sourceId, tenantId);
    await this.validatePipelineAndStage(
      dto.pipelineId,
      dto.pipelineStageId,
      tenantId,
    );
    const assignee = await this.resolveAssignee(dto.assignedUserId, tenantId);
    await this.validateProjects(dto.projectInterests, tenantId);

    const fullName = normalizeDisplayName(dto.fullName);
    const primaryPhone = dto.primaryPhone.trim();
    const primaryPhoneNormalized = this.normalizePhone(primaryPhone);
    const secondaryPhone = this.resolveSecondaryPhone(dto.secondaryPhone);
    const secondaryPhoneNormalized = secondaryPhone
      ? this.normalizePhone(secondaryPhone)
      : null;

    this.ensurePhonesDistinct(primaryPhoneNormalized, secondaryPhoneNormalized);

    // Required custom fields apply to every new lead, submitted or not.
    const customFields = this.customFields.resolveLeadValues({
      definitions: await this.customFields.getLeadDefinitions(tenantId),
      existing: null,
      submitted: dto.customFields,
      required: 'all',
    });

    const duplicateWarning = await this.detectDuplicates(
      tenantId,
      primaryPhoneNormalized,
      secondaryPhoneNormalized,
      scope,
    );

    const leadId = await this.prisma.$transaction(async (tx) => {
      await this.quotaService.assertCanCreateLeadInTransaction(tx, tenantId);

      const lead = await tx.lead.create({
        data: {
          tenantId,
          sourceId: dto.sourceId ?? null,
          pipelineId: dto.pipelineId,
          pipelineStageId: dto.pipelineStageId,
          assignedUserId: assignee?.id ?? null,
          assignedAt: assignee ? new Date() : null,
          status: LeadStatus.OPEN,
          fullName,
          primaryPhone,
          primaryPhoneNormalized,
          secondaryPhone,
          secondaryPhoneNormalized,
          email: dto.email ?? null,
          ...this.buildProfileData(dto),
          ...(Object.keys(customFields).length > 0
            ? { customFields: customFields as Prisma.InputJsonObject }
            : {}),
        },
        select: { id: true },
      });

      if (dto.projectInterests?.length) {
        await tx.leadProjectInterest.createMany({
          data: dto.projectInterests.map((interest) => ({
            leadId: lead.id,
            projectId: interest.projectId,
            interestLevel: interest.interestLevel ?? null,
          })),
        });
      }

      await this.leadActivityService.createActivity(
        {
          tenantId,
          leadId: lead.id,
          actorUserId,
          eventType: LeadActivityEventType.LEAD_CREATED,
          metadata: { source: 'manual' },
        },
        tx,
      );

      if (assignee) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: lead.id,
            actorUserId,
            eventType: LeadActivityEventType.ASSIGNED,
            metadata: {
              assignedUserId: assignee.id,
              assignedUserName: assignee.name,
            },
          },
          tx,
        );
      }

      return lead.id;
    });

    // The creator just made it; it may be assigned outside their own scope.
    const lead = await this.getLeadOrThrow(leadId, tenantId, SYSTEM_LEAD_SCOPE);

    void this.domainEventBus.publish(new LeadCreatedEvent(tenantId, leadId));

    return {
      lead: toLeadResponse(lead),
      duplicateWarning,
    };
  }

  async getDefaultPipelinePlacement(
    tenantId: string,
  ): Promise<DefaultPipelinePlacement> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId, isDefault: true },
      select: {
        id: true,
        stages: {
          select: { id: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    });

    if (!pipeline || pipeline.stages.length === 0) {
      throw new BadRequestException('Default pipeline is not configured');
    }

    return {
      pipelineId: pipeline.id,
      pipelineStageId: pipeline.stages[0].id,
    };
  }

  /** Legacy row API used by the CSV importer. */
  async createLeadFromImport(
    tenantId: string,
    actorUserId: string,
    importJobId: string,
    row: ImportLeadRowInput,
    pipeline: DefaultPipelinePlacement,
  ): Promise<ImportLeadRowResult> {
    const result = await this.createSystemLead(tenantId, row, pipeline, {
      origin: 'import',
      actorUserId,
      importJobId,
    });
    switch (result.status) {
      case 'created':
      case 'already-created':
        return { success: true, leadId: result.leadId };
      case 'duplicate':
        return { success: false, reason: 'Duplicate lead detected' };
      case 'failed':
        return { success: false, reason: result.reason };
    }
  }

  /**
   * The one creation path for leads that no user typed in: import rows and
   * inbound integrations. Same normalization, duplicate rules, quota and
   * timeline as a manual lead; retries of the same import row or externalId
   * never create a second lead. Publishes LeadCreatedEvent, so the rules
   * engine plans the first call (R1) or the "assign new leads" task (R13).
   */
  async createSystemLead(
    tenantId: string,
    row: SystemLeadInput,
    placement: DefaultPipelinePlacement,
    options: SystemLeadOptions,
  ): Promise<SystemLeadResult> {
    // Idempotency first: a retried row or a re-sent integration call.
    const previous = await this.findSystemLeadOrigin(tenantId, row, options);
    if (previous) return { status: 'already-created', leadId: previous };

    if (row.sourceId) {
      const source = await this.prisma.leadSource.findFirst({
        where: { id: row.sourceId, tenantId },
        select: { id: true },
      });
      if (!source) return { status: 'failed', reason: 'Unknown lead source' };
    }

    let assignee: { id: string; name: string } | null = null;
    try {
      assignee = await this.resolveAssignee(row.assignedUserId, tenantId);
    } catch (error) {
      return {
        status: 'failed',
        reason: error instanceof Error ? error.message : 'Invalid assignee',
      };
    }

    const projectIds = [...new Set(row.projectIds ?? [])];
    if (projectIds.length > 0) {
      const found = await this.prisma.project.count({
        where: { id: { in: projectIds }, tenantId, deletedAt: null },
      });
      if (found !== projectIds.length) {
        return { status: 'failed', reason: 'Unknown project' };
      }
    }

    const fullName = normalizeDisplayName(row.fullName ?? '');
    if (fullName.length < 2) {
      return { status: 'failed', reason: 'Name must be at least 2 characters' };
    }
    const primaryPhone = (row.primaryPhone ?? '').trim();
    if (primaryPhone.length === 0) {
      return { status: 'failed', reason: 'Missing phone number' };
    }
    const primaryPhoneNormalized = this.normalizePhone(primaryPhone);
    const secondaryPhone = this.resolveSecondaryPhone(row.secondaryPhone);
    const secondaryPhoneNormalized = secondaryPhone
      ? this.normalizePhone(secondaryPhone)
      : null;
    try {
      this.ensurePhonesDistinct(
        primaryPhoneNormalized,
        secondaryPhoneNormalized,
      );
    } catch (error) {
      return {
        status: 'failed',
        reason:
          error instanceof BadRequestException
            ? error.message
            : 'Secondary phone must not match primary phone',
      };
    }
    const email = this.resolveImportEmail(row.email);
    if (email === 'invalid')
      return { status: 'failed', reason: 'Invalid email' };

    if ((options.duplicatePolicy ?? 'SKIP') === 'SKIP') {
      const existing = await this.findLeadByPhones(
        tenantId,
        primaryPhoneNormalized,
        secondaryPhoneNormalized,
      );
      if (existing) {
        return {
          status: 'duplicate',
          existingLeadId: existing.id,
          existingAssigneeId: existing.assignedUserId,
          existingIsOpen: existing.isOpen,
        };
      }
    }

    let leadId: string | null;
    try {
      leadId = await this.prisma.$transaction(async (tx) => {
        const allowed = await this.quotaService.canCreateLeadInTransaction(
          tx,
          tenantId,
        );
        if (!allowed) return null;

        const lead = await tx.lead.create({
          data: {
            tenantId,
            sourceId: row.sourceId ?? null,
            pipelineId: placement.pipelineId,
            pipelineStageId: placement.pipelineStageId,
            assignedUserId: assignee?.id ?? null,
            assignedAt: assignee ? new Date() : null,
            status: LeadStatus.OPEN,
            fullName,
            primaryPhone,
            primaryPhoneNormalized,
            secondaryPhone,
            secondaryPhoneNormalized,
            email,
            externalId: row.externalId ?? null,
            importJobId: options.importJobId ?? null,
            importRowNumber: options.importRowNumber ?? null,
            ...this.importProfileData(row.profile),
            ...(row.customFields && Object.keys(row.customFields).length > 0
              ? { customFields: row.customFields as Prisma.InputJsonObject }
              : {}),
          },
          select: { id: true },
        });

        if (projectIds.length > 0) {
          await tx.leadProjectInterest.createMany({
            data: projectIds.map((projectId) => ({
              leadId: lead.id,
              projectId,
            })),
            skipDuplicates: true,
          });
        }

        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: lead.id,
            actorUserId: options.actorUserId,
            eventType: LeadActivityEventType.LEAD_CREATED,
            metadata: {
              source: options.origin,
              ...(options.importJobId
                ? { importJobId: options.importJobId }
                : {}),
              ...(options.importRowNumber
                ? { importRowNumber: options.importRowNumber }
                : {}),
              ...(row.externalId ? { externalId: row.externalId } : {}),
              ...(row.message ? { message: row.message.slice(0, 1000) } : {}),
              ...(options.metadata ?? {}),
            },
          },
          tx,
        );

        if (assignee) {
          await this.leadActivityService.createActivity(
            {
              tenantId,
              leadId: lead.id,
              actorUserId: options.actorUserId,
              eventType: LeadActivityEventType.ASSIGNED,
              metadata: {
                assignedUserId: assignee.id,
                assignedUserName: assignee.name,
              },
            },
            tx,
          );
        }
        return lead.id;
      });
    } catch (error) {
      // Lost a race with the same row / externalId: report the winner.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.findSystemLeadOrigin(tenantId, row, options);
        if (winner) return { status: 'already-created', leadId: winner };
      }
      throw error;
    }

    if (leadId === null)
      return { status: 'failed', reason: 'Lead quota exceeded' };

    void this.domainEventBus.publish(new LeadCreatedEvent(tenantId, leadId));
    return { status: 'created', leadId };
  }

  /** A lead this exact import row or integration id already created. */
  private async findSystemLeadOrigin(
    tenantId: string,
    row: SystemLeadInput,
    options: SystemLeadOptions,
  ): Promise<string | null> {
    // A lead merged into another still answers for its row / externalId:
    // the retry points at the survivor instead of creating a new lead.
    const survivor = (lead: { id: string; mergedIntoId: string | null }) =>
      lead.mergedIntoId ?? lead.id;

    if (options.importJobId && options.importRowNumber) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          importJobId: options.importJobId,
          importRowNumber: options.importRowNumber,
        },
        select: { id: true, mergedIntoId: true },
      });
      if (lead) return survivor(lead);
    }
    if (row.externalId) {
      const lead = await this.prisma.lead.findFirst({
        where: {
          tenantId,
          externalId: row.externalId,
          OR: [{ deletedAt: null }, { mergedIntoId: { not: null } }],
        },
        orderBy: { deletedAt: { sort: 'asc', nulls: 'first' } },
        select: { id: true, mergedIntoId: true },
      });
      if (lead) return survivor(lead);
    }
    return null;
  }

  /** The lead that owns one of these phones (open leads first). */
  async findLeadByPhones(
    tenantId: string,
    primaryPhoneNormalized: string,
    secondaryPhoneNormalized: string | null,
  ): Promise<{
    id: string;
    assignedUserId: string | null;
    isOpen: boolean;
  } | null> {
    const phones = [primaryPhoneNormalized, secondaryPhoneNormalized].filter(
      (phone): phone is string => Boolean(phone),
    );
    const matches = await this.prisma.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: phones.flatMap((phone) => [
          { primaryPhoneNormalized: phone },
          { secondaryPhoneNormalized: phone },
        ]),
      },
      select: {
        id: true,
        assignedUserId: true,
        status: true,
        pipelineStage: { select: { isClosed: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    if (matches.length === 0) return null;
    const isOpen = (lead: (typeof matches)[number]) =>
      lead.status === LeadStatus.OPEN && !lead.pipelineStage.isClosed;
    const best = matches.find(isOpen) ?? matches[0];
    return {
      id: best.id,
      assignedUserId: best.assignedUserId,
      isOpen: isOpen(best),
    };
  }

  async updateLead(
    id: string,
    tenantId: string,
    dto: UpdateLeadDto,
    actorUserId: string | null,
    scope: LeadScope,
  ): Promise<LeadMutationResult> {
    const existing = await this.getLeadOrThrow(id, tenantId, scope);
    const statusChange =
      dto.status !== undefined && dto.status !== existing.status
        ? dto.status
        : null;

    if (dto.sourceId !== undefined) {
      await this.validateSource(dto.sourceId, tenantId);
    }

    if (dto.projectInterests !== undefined) {
      await this.validateProjects(dto.projectInterests, tenantId);
    }

    const fullName =
      dto.fullName !== undefined
        ? normalizeDisplayName(dto.fullName)
        : existing.fullName;

    const primaryPhone =
      dto.primaryPhone !== undefined
        ? dto.primaryPhone.trim()
        : existing.primaryPhone;

    const primaryPhoneNormalized =
      dto.primaryPhone !== undefined
        ? this.normalizePhone(primaryPhone)
        : existing.primaryPhoneNormalized;

    let secondaryPhone: string | null;
    let secondaryPhoneNormalized: string | null;

    if (dto.secondaryPhone !== undefined) {
      secondaryPhone = this.resolveSecondaryPhone(dto.secondaryPhone);
      secondaryPhoneNormalized = secondaryPhone
        ? this.normalizePhone(secondaryPhone)
        : null;
    } else {
      secondaryPhone = existing.secondaryPhone;
      secondaryPhoneNormalized = existing.secondaryPhoneNormalized;
    }

    if (dto.primaryPhone !== undefined || dto.secondaryPhone !== undefined) {
      this.ensurePhonesDistinct(
        primaryPhoneNormalized,
        secondaryPhoneNormalized,
      );
    }

    const duplicateWarning = await this.detectDuplicates(
      tenantId,
      primaryPhoneNormalized,
      secondaryPhoneNormalized,
      scope,
      existing.id,
    );

    const customFieldDefinitions =
      dto.customFields !== undefined
        ? await this.customFields.getLeadDefinitions(tenantId)
        : null;

    await this.prisma.$transaction(async (tx) => {
      const customFields = customFieldDefinitions
        ? await this.mergeLeadCustomFields(
            tx,
            existing.id,
            customFieldDefinitions,
            dto.customFields,
          )
        : undefined;

      await tx.lead.update({
        where: { id: existing.id },
        data: {
          ...(dto.sourceId !== undefined ? { sourceId: dto.sourceId } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.fullName !== undefined ? { fullName } : {}),
          ...(dto.primaryPhone !== undefined
            ? { primaryPhone, primaryPhoneNormalized }
            : {}),
          ...(dto.secondaryPhone !== undefined
            ? { secondaryPhone, secondaryPhoneNormalized }
            : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...this.buildProfileData(dto, existing),
          ...(customFields !== undefined ? { customFields } : {}),
        },
      });

      if (statusChange === LeadStatus.ARCHIVED) {
        // An archived lead has no next step, same as a closed one.
        const cancelledTaskCount = await this.taskLifecycle.cancelOpenTasks(
          existing.id,
          tx,
        );
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: existing.id,
            actorUserId,
            eventType: LeadActivityEventType.STATUS_ARCHIVED,
            metadata: { cancelledTaskCount },
          },
          tx,
        );
      } else if (statusChange === LeadStatus.OPEN) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: existing.id,
            actorUserId,
            eventType: LeadActivityEventType.STATUS_RESTORED,
          },
          tx,
        );
      }

      if (dto.projectInterests !== undefined) {
        // Diff instead of delete-all/recreate so untouched interests keep their
        // original createdAt (analytics buckets project interest by that date).
        const keepProjectIds = dto.projectInterests.map(
          (interest) => interest.projectId,
        );

        await tx.leadProjectInterest.deleteMany({
          where: {
            leadId: existing.id,
            ...(keepProjectIds.length > 0
              ? { projectId: { notIn: keepProjectIds } }
              : {}),
          },
        });

        for (const interest of dto.projectInterests) {
          await tx.leadProjectInterest.upsert({
            where: {
              leadId_projectId: {
                leadId: existing.id,
                projectId: interest.projectId,
              },
            },
            create: {
              leadId: existing.id,
              projectId: interest.projectId,
              interestLevel: interest.interestLevel ?? null,
            },
            update: { interestLevel: interest.interestLevel ?? null },
          });
        }
      }
    });

    const lead = await this.getLeadOrThrow(
      existing.id,
      tenantId,
      SYSTEM_LEAD_SCOPE,
    );

    void this.domainEventBus.publish(
      new LeadUpdatedEvent(tenantId, existing.id),
    );

    return {
      lead: toLeadResponse(lead),
      duplicateWarning,
    };
  }

  buildLeadsOrderBy(
    sortBy?: string,
    sortOrder?: SortOrder,
  ): Prisma.LeadOrderByWithRelationInput {
    return buildOrderBy(sortBy, sortOrder, LEAD_SORT_CONFIG);
  }

  buildLeadsWhereInput(
    tenantId: string,
    filters: LeadListFilters,
  ): Prisma.LeadWhereInput {
    const search = normalizeSearch(filters.search);

    return {
      tenantId,
      deletedAt: null,
      ...(filters.id ? { id: filters.id } : {}),
      ...(filters.pipelineId ? { pipelineId: filters.pipelineId } : {}),
      ...(filters.stageId ? { pipelineStageId: filters.stageId } : {}),
      ...(filters.sourceId ? { sourceId: filters.sourceId } : {}),
      ...(filters.assignedUserId
        ? { assignedUserId: filters.assignedUserId }
        : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.unassignedOnly ? UNASSIGNED_OPEN_LEAD_WHERE : {}),
      ...(filters.stageIds?.length
        ? { pipelineStageId: { in: filters.stageIds } }
        : {}),
      ...(filters.sourceIds?.length
        ? { sourceId: { in: filters.sourceIds } }
        : {}),
      ...(filters.heat?.length ? { heat: { in: filters.heat } } : {}),
      ...(filters.lostReasonId ? { lostReasonId: filters.lostReasonId } : {}),
      ...(filters.unansweredMin
        ? { unansweredStreak: { gte: filters.unansweredMin } }
        : {}),
      ...(filters.paymentPreferences?.length
        ? { paymentPreference: { in: filters.paymentPreferences } }
        : {}),
      ...(filters.contactChannelPreferences?.length
        ? {
            contactChannelPreference: { in: filters.contactChannelPreferences },
          }
        : {}),
      ...(filters.purchasePurposes?.length
        ? { purchasePurpose: { in: filters.purchasePurposes } }
        : {}),
      ...(filters.residenceArea
        ? {
            residenceArea: {
              contains: filters.residenceArea,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(filters.occupation
        ? {
            occupation: {
              contains: filters.occupation,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(filters.createdFrom || filters.createdTo
        ? {
            createdAt: {
              ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
              ...(filters.createdTo ? { lte: filters.createdTo } : {}),
            },
          }
        : {}),
      ...(filters.closedFrom || filters.closedTo
        ? {
            closedAt: {
              ...(filters.closedFrom ? { gte: filters.closedFrom } : {}),
              ...(filters.closedTo ? { lte: filters.closedTo } : {}),
            },
          }
        : {}),
      // Conditions that need their own OR (or would collide on a key) are
      // combined with AND so none overwrites another.
      ...this.combineAnd([
        filters.openOnly ? OPEN_LEAD_WHERE : null,
        filters.staleOnly ? this.buildStaleLeadWhereInput() : null,
        filters.assignedOnly ? ASSIGNED_LEAD_WHERE : null,
        filters.slaBreached === 'today'
          ? slaBreachedWhere(
              filters.todayBounds ??
                dayBoundsInZone(new Date(), 'Africa/Cairo'),
            )
          : null,
        filters.stuck
          ? stuckLeadWhere(filters.stageThresholds?.stuck ?? [], new Date())
          : null,
        filters.stageStale
          ? stageStaleLeadWhere(
              filters.stageThresholds?.stale ?? [],
              new Date(),
            )
          : null,
        search ? this.buildSearchWhereInput(search) : null,
        this.buildAssigneesWhereInput(filters.assignees),
        this.buildInterestWhereInput(filters.projectId, filters.interestLevel),
        this.buildLastContactWhereInput(filters.lastContact),
        this.buildNextStepWhereInput(filters.nextStep, filters.todayBounds),
        this.buildBudgetWhereInput(filters.budgetMin, filters.budgetMax),
      ]),
    };
  }

  /**
   * Ids of every lead matching the filters, for bulk "all matching" actions.
   * Refuses (instead of silently truncating) when more than `cap` match.
   */
  async findMatchingLeadIds(
    tenantId: string,
    filters: LeadListFilters,
    cap: number,
    scope: LeadScope,
  ): Promise<string[]> {
    const where: Prisma.LeadWhereInput = {
      AND: [
        this.buildLeadsWhereInput(tenantId, {
          ...filters,
          ...(await this.loadFilterContext(tenantId, filters)),
        }),
        leadScopeWhere(scope),
      ],
    };
    const leads = await this.prisma.lead.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: cap + 1,
    });
    if (leads.length > cap) {
      throw new BadRequestException(
        `More than ${cap} leads match these filters. Narrow them down and try again.`,
      );
    }
    return leads.map((lead) => lead.id);
  }

  /**
   * Submitted custom field values merged into the stored ones, read under a
   * row lock so two concurrent edits of different fields both survive.
   * Values of archived fields and unknown keys are kept as they are.
   */
  private async mergeLeadCustomFields(
    tx: Prisma.TransactionClient,
    leadId: string,
    definitions: Awaited<ReturnType<CustomFieldsService['getLeadDefinitions']>>,
    submitted: Record<string, unknown> | undefined,
  ): Promise<Prisma.InputJsonObject | typeof Prisma.DbNull> {
    const rows = await tx.$queryRaw<Array<{ customFields: unknown }>>`
      SELECT "customFields" FROM "Lead" WHERE id = ${leadId}::uuid FOR UPDATE
    `;
    const merged = this.customFields.resolveLeadValues({
      definitions,
      existing: rows[0]?.customFields ?? null,
      submitted,
      required: 'all',
    });
    return Object.keys(merged).length > 0
      ? (merged as Prisma.InputJsonObject)
      : Prisma.DbNull;
  }

  /**
   * Profile columns present in the DTO (undefined = untouched, null = clear).
   * Budget min may not exceed max, taking unchanged values into account.
   */
  private buildProfileData(
    dto: LeadProfileFieldsDto,
    existing?: {
      budgetMin: Prisma.Decimal | null;
      budgetMax: Prisma.Decimal | null;
    },
  ): Partial<
    Pick<Prisma.LeadUncheckedCreateInput, (typeof LEAD_PROFILE_KEYS)[number]>
  > {
    const data: Record<string, unknown> = {};
    for (const key of LEAD_PROFILE_KEYS) {
      if (dto[key] !== undefined) data[key] = dto[key];
    }
    const min =
      dto.budgetMin !== undefined
        ? dto.budgetMin
        : existing?.budgetMin != null
          ? Number(existing.budgetMin)
          : null;
    const max =
      dto.budgetMax !== undefined
        ? dto.budgetMax
        : existing?.budgetMax != null
          ? Number(existing.budgetMax)
          : null;
    if (min != null && max != null && min > max) {
      throw new BadRequestException(
        'Budget minimum cannot be above the maximum',
      );
    }
    return data;
  }

  /** Imported profile values; an inverted budget range is dropped, not fatal. */
  private importProfileData(profile?: ImportLeadProfile) {
    if (!profile) return {};
    const { budgetMin, budgetMax, ...rest } = profile;
    const budgetOk =
      budgetMin === undefined ||
      budgetMax === undefined ||
      budgetMin <= budgetMax;
    return {
      ...rest,
      ...(budgetOk ? { budgetMin, budgetMax } : {}),
    };
  }

  /** Leads (in the given set) with what a transfer needs to plan and summarize. */
  async getTransferCandidates(tenantId: string, leadIds: string[]) {
    if (leadIds.length === 0) return [];
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        id: { in: leadIds },
        pipelineStage: { isClosed: false },
      },
      select: {
        id: true,
        heat: true,
        nextTaskDueAt: true,
        pipelineStage: {
          select: { id: true, name: true, color: true, icon: true },
        },
        _count: { select: { tasks: { where: { status: 'OPEN' } } } },
      },
    });
    return leads.map((lead) => ({
      id: lead.id,
      heat: lead.heat,
      nextTaskDueAt: lead.nextTaskDueAt,
      stage: lead.pipelineStage,
      openTaskCount: lead._count.tasks,
    }));
  }

  /**
   * What some filters need from the database: the tenant's "today" and the
   * stages' stuck / stale thresholds. Loaded only when such a filter is set.
   */
  private async loadFilterContext(
    tenantId: string,
    filters: Pick<
      LeadListFilters,
      'nextStep' | 'slaBreached' | 'stuck' | 'stageStale'
    >,
  ): Promise<Pick<LeadListFilters, 'todayBounds' | 'stageThresholds'>> {
    const needsToday =
      filters.nextStep === 'today' || filters.slaBreached === 'today';
    const needsStages = Boolean(filters.stuck || filters.stageStale);
    const [todayBounds, stageRows] = await Promise.all([
      needsToday ? this.tenantTodayBounds(tenantId) : undefined,
      needsStages ? loadStageThresholdRows(this.prisma, tenantId) : undefined,
    ]);
    return {
      todayBounds,
      stageThresholds: stageRows ? toStageThresholds(stageRows) : undefined,
    };
  }

  private async tenantTodayBounds(
    tenantId: string,
  ): Promise<{ start: Date; end: Date }> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { timezone: true },
    });
    return dayBoundsInZone(new Date(), settings?.timezone ?? 'Africa/Cairo');
  }

  private buildAssigneesWhereInput(
    assignees?: string[],
  ): Prisma.LeadWhereInput | null {
    if (!assignees?.length) return null;
    const ids = assignees.filter((a) => a !== 'unassigned');
    const includeUnassigned = ids.length !== assignees.length;
    const or: Prisma.LeadWhereInput[] = [];
    if (ids.length) or.push({ assignedUserId: { in: ids } });
    if (includeUnassigned) or.push({ assignedUserId: null });
    return or.length === 1 ? or[0] : { OR: or };
  }

  private buildInterestWhereInput(
    projectId?: string,
    interestLevel?: LeadListFilters['interestLevel'],
  ): Prisma.LeadWhereInput | null {
    if (!projectId && !interestLevel) return null;
    return {
      leadProjectInterests: {
        some: {
          ...(projectId ? { projectId } : {}),
          ...(interestLevel ? { interestLevel } : {}),
        },
      },
    };
  }

  private buildLastContactWhereInput(
    lastContact?: LeadListFilters['lastContact'],
  ): Prisma.LeadWhereInput | null {
    if (!lastContact) return null;
    return lastContactWhere(lastContact, new Date());
  }

  /** Next-step filters only make sense for open leads. */
  private buildNextStepWhereInput(
    nextStep?: LeadListFilters['nextStep'],
    todayBounds?: { start: Date; end: Date },
  ): Prisma.LeadWhereInput | null {
    if (!nextStep) return null;
    const now = new Date();
    return nextStepWhere(
      nextStep,
      now,
      todayBounds ?? dayBoundsInZone(now, 'Africa/Cairo'),
    );
  }

  /** Overlap between the lead's budget range and the requested range. */
  private buildBudgetWhereInput(
    budgetMin?: number,
    budgetMax?: number,
  ): Prisma.LeadWhereInput | null {
    if (budgetMin === undefined && budgetMax === undefined) return null;
    return {
      AND: [
        ...(budgetMin !== undefined
          ? [
              {
                OR: [
                  { budgetMax: { gte: budgetMin } },
                  { budgetMax: null, budgetMin: { gte: budgetMin } },
                ],
              },
            ]
          : []),
        ...(budgetMax !== undefined ? [{ budgetMin: { lte: budgetMax } }] : []),
      ],
    };
  }

  private combineAnd(
    parts: Array<Prisma.LeadWhereInput | null>,
  ): Prisma.LeadWhereInput {
    const present = parts.filter(
      (part): part is Prisma.LeadWhereInput => part !== null,
    );
    if (present.length === 0) return {};
    if (present.length === 1) return present[0];
    return { AND: present };
  }

  private buildSearchWhereInput(search: string): Prisma.LeadWhereInput {
    const or: Prisma.LeadWhereInput[] = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { primaryPhone: { contains: search, mode: 'insensitive' } },
      { secondaryPhone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];

    // Match phone fragments regardless of how they were typed or stored
    // (01…, +20…, 0020…, Arabic digits).
    const phoneCore = phoneSearchCore(search);
    if (phoneCore) {
      or.push(
        { primaryPhoneNormalized: { contains: phoneCore } },
        { secondaryPhoneNormalized: { contains: phoneCore } },
      );
    }

    return { OR: or };
  }

  private buildStaleLeadWhereInput(): Prisma.LeadWhereInput {
    const staleBefore = new Date();
    staleBefore.setUTCDate(staleBefore.getUTCDate() - 7);

    return {
      status: LeadStatus.OPEN,
      pipelineStage: { isClosed: false },
      OR: [
        {
          lastContactedAt: null,
          createdAt: { lt: staleBefore },
        },
        {
          lastContactedAt: { lt: staleBefore },
        },
      ],
    };
  }

  private buildWhereClause(
    tenantId: string,
    query: GetLeadsQueryDto,
    context: Pick<LeadListFilters, 'todayBounds' | 'stageThresholds'>,
  ): Prisma.LeadWhereInput {
    return this.buildLeadsWhereInput(tenantId, {
      id: query.id,
      pipelineId: query.pipelineId,
      stageId: query.stageId,
      sourceId: query.sourceId,
      assignedUserId: query.assignedUserId,
      status: query.status,
      projectId: query.projectId,
      search: query.search,
      unassignedOnly: query.unassignedOnly,
      staleOnly: query.staleOnly,
      openOnly: query.openOnly,
      assignees: query.assignees,
      stageIds: query.stageIds,
      sourceIds: query.sourceIds,
      heat: query.heat,
      interestLevel: query.interestLevel,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      closedFrom: query.closedFrom,
      closedTo: query.closedTo,
      lastContact: query.lastContact,
      nextStep: query.nextStep,
      slaBreached: query.slaBreached,
      stuck: query.stuck,
      stageStale: query.stageStale,
      assignedOnly: query.assignedOnly,
      ...context,
      unansweredMin: query.unansweredMin,
      lostReasonId: query.lostReasonId,
      budgetMin: query.budgetMin,
      budgetMax: query.budgetMax,
      paymentPreferences: query.paymentPreferences,
      contactChannelPreferences: query.contactChannelPreferences,
      purchasePurposes: query.purchasePurposes,
      residenceArea: query.residenceArea,
      occupation: query.occupation,
    });
  }

  private buildOrderBy(
    query: GetLeadsQueryDto,
  ): Prisma.LeadOrderByWithRelationInput {
    return this.buildLeadsOrderBy(query.sortBy, query.sortOrder);
  }

  private async getLeadOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<Prisma.LeadGetPayload<{ select: typeof leadSelect }>> {
    // Out of scope behaves exactly like missing.
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: leadSelect,
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  private normalizePhone(phone: string): string {
    return normalizePhone(phone);
  }

  private resolveSecondaryPhone(phone?: string | null): string | null {
    if (phone === undefined || phone === null) {
      return null;
    }

    const trimmed = phone.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveImportEmail(email?: string | null): string | null {
    if (email === undefined || email === null) {
      return null;
    }

    const trimmed = email.trim().toLowerCase();

    if (trimmed.length === 0) {
      return null;
    }

    return isEmail(trimmed) ? trimmed : 'invalid';
  }

  private ensurePhonesDistinct(
    primaryNormalized: string,
    secondaryNormalized: string | null,
  ): void {
    if (
      secondaryNormalized !== null &&
      secondaryNormalized === primaryNormalized
    ) {
      throw new BadRequestException(
        'Secondary phone must not match primary phone',
      );
    }
  }

  private async validatePipelineAndStage(
    pipelineId: string,
    pipelineStageId: string,
    tenantId: string,
  ): Promise<void> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId },
      select: { id: true },
    });

    if (!pipeline) {
      throw new BadRequestException('Pipeline not found');
    }

    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: pipelineStageId,
        tenantId,
        pipelineId,
      },
      select: { id: true, isClosed: true },
    });

    if (!stage) {
      throw new BadRequestException(
        'Pipeline stage not found or does not belong to pipeline',
      );
    }
    // Winning records a deal and losing needs a reason: both happen through
    // a stage move, never on creation.
    if (stage.isClosed) {
      throw new BadRequestException(
        'New leads start in an open stage. Create the lead, then move it to Won or Lost.',
      );
    }
  }

  private async validateSource(
    sourceId: string | null | undefined,
    tenantId: string,
  ): Promise<void> {
    if (sourceId === undefined || sourceId === null) {
      return;
    }

    const source = await this.prisma.leadSource.findFirst({
      where: { id: sourceId, tenantId },
      select: { id: true },
    });

    if (!source) {
      throw new BadRequestException('Lead source not found');
    }
  }

  private async resolveAssignee(
    assignedUserId: string | null | undefined,
    tenantId: string,
  ): Promise<{ id: string; name: string } | null> {
    if (assignedUserId === undefined || assignedUserId === null) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: assignedUserId,
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new BadRequestException('Assigned user not found');
    }

    return user;
  }

  private async validateProjects(
    projectInterests: ProjectInterestDto[] | undefined,
    tenantId: string,
  ): Promise<void> {
    if (!projectInterests?.length) {
      return;
    }

    const projectIds = projectInterests.map((interest) => interest.projectId);

    if (new Set(projectIds).size !== projectIds.length) {
      throw new BadRequestException(
        'Duplicate project interests are not allowed',
      );
    }

    const projects = await this.prisma.project.findMany({
      where: {
        id: { in: projectIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (projects.length !== projectIds.length) {
      throw new BadRequestException('One or more projects not found');
    }
  }

  private async detectDuplicates(
    tenantId: string,
    primaryPhoneNormalized: string,
    secondaryPhoneNormalized: string | null,
    scope: LeadScope,
    excludeLeadId?: string,
  ): Promise<DuplicateWarning | null> {
    // Soft detection only — never blocks create/update. Uses composite indexes:
    // Lead_tenantId_primaryPhoneNormalized_idx, Lead_tenantId_secondaryPhoneNormalized_idx
    const phones = [primaryPhoneNormalized];

    if (secondaryPhoneNormalized) {
      phones.push(secondaryPhoneNormalized);
    }

    const matches = await this.prisma.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
        OR: phones.flatMap((phone) => [
          { primaryPhoneNormalized: phone },
          { secondaryPhoneNormalized: phone },
        ]),
      },
      select: {
        id: true,
        fullName: true,
        assignedUserId: true,
        assignedUser: { select: { name: true } },
      },
      take: 10,
    });

    if (matches.length === 0) {
      return null;
    }

    // Leads outside the actor's scope only reveal who handles them.
    return {
      detected: true,
      matches: matches.map((match) =>
        isAssigneeInScope(scope, match.assignedUserId)
          ? {
              id: match.id,
              fullName: match.fullName,
              assigneeName: match.assignedUser?.name ?? null,
              visible: true,
            }
          : {
              id: null,
              fullName: null,
              assigneeName: match.assignedUser?.name ?? null,
              visible: false,
            },
      ),
    };
  }
}
