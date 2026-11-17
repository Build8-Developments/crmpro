import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  Prisma,
  TaskStatus,
} from '@crmpro/database';
import { AuditWriterService } from '../audit/audit-writer.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import {
  AUDIT_ENTITY_TYPES,
  LEAD_AUDIT_ACTIONS,
} from '../audit/audit.constants';
import { isEmail } from 'class-validator';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildOrderBy, normalizeSearch, SortOrder } from '../../common/query';
import { normalizeDisplayName } from '../../common/utils/name-normalization.util';
import { normalizePhone } from '../../common/utils/phone-normalization.util';
import { CreateLeadDto } from './dto/create-lead.dto';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto';
import { ProjectInterestDto } from './dto/project-interest.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { leadSelect, toLeadResponse } from './lead.mapper';
import { LeadActivityService } from './services/lead-activity.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import {
  LeadCreatedEvent,
  LeadUpdatedEvent,
} from '../../common/events/domain-event.types';
import {
  isAssigneeInScope,
  leadScopeWhere,
  SYSTEM_LEAD_SCOPE,
  type LeadScope,
} from './scope';
import {
  DefaultPipelinePlacement,
  DuplicateWarning,
  LeadActorAccess,
  ImportLeadRowInput,
  ImportLeadRowResult,
  LeadListFilters,
  LeadMutationResult,
  LeadResponse,
} from './types/lead.types';

const LEAD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'lastContactedAt',
  'nextFollowUpAt',
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
    private readonly auditWriter: AuditWriterService,
    private readonly customFieldsService: CustomFieldsService,
  ) {}

  async listLeads(
    tenantId: string,
    query: GetLeadsQueryDto,
    scope: LeadScope,
  ): Promise<PaginatedResponse<LeadResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(tenantId, query, scope);
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
    const lead = await this.getLeadOrThrow(id, tenantId, scope);
    return toLeadResponse(lead);
  }

  async createLead(
    tenantId: string,
    actorUserId: string,
    dto: CreateLeadDto,
    access: LeadActorAccess,
  ): Promise<LeadMutationResult> {
    await this.validateSource(dto.sourceId, tenantId);
    await this.validatePipelineAndStage(
      dto.pipelineId,
      dto.pipelineStageId,
      tenantId,
    );
    const assignee = await this.resolveAssignee(
      this.resolveCreateAssigneeId(dto.assignedUserId, actorUserId, access),
      tenantId,
    );
    await this.validateProjects(dto.projectInterests, tenantId);

    const fullName = normalizeDisplayName(dto.fullName);
    const primaryPhone = dto.primaryPhone.trim();
    const primaryPhoneNormalized = this.normalizePhone(primaryPhone);
    const secondaryPhone = this.resolveSecondaryPhone(dto.secondaryPhone);
    const secondaryPhoneNormalized = secondaryPhone
      ? this.normalizePhone(secondaryPhone)
      : null;

    this.ensurePhonesDistinct(primaryPhoneNormalized, secondaryPhoneNormalized);

    const customFields = await this.customFieldsService.resolveLeadValues(
      tenantId,
      null,
      dto.customFields,
      { creating: true },
    );

    const duplicateWarning = await this.detectDuplicates(
      tenantId,
      primaryPhoneNormalized,
      secondaryPhoneNormalized,
      access.scope,
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
          ...(customFields ? { customFields } : {}),
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

  async createLeadFromImport(
    tenantId: string,
    actorUserId: string,
    importJobId: string,
    row: ImportLeadRowInput,
    pipeline: DefaultPipelinePlacement,
  ): Promise<ImportLeadRowResult> {
    if (row.sourceId) {
      await this.validateSource(row.sourceId, tenantId);
    }

    const assignee = await this.resolveAssignee(row.assignedUserId, tenantId);

    const fullName = normalizeDisplayName(row.fullName);

    if (fullName.length < 2) {
      return {
        success: false,
        reason: 'fullName must be at least 2 characters',
      };
    }

    const primaryPhone = row.primaryPhone.trim();

    if (primaryPhone.length === 0) {
      return { success: false, reason: 'Missing primaryPhone' };
    }

    const primaryPhoneNormalized = this.normalizePhone(primaryPhone);

    const secondaryPhone = this.resolveSecondaryPhone(row.secondaryPhone);
    let secondaryPhoneNormalized: string | null = null;

    if (secondaryPhone) {
      secondaryPhoneNormalized = this.normalizePhone(secondaryPhone);
    }

    try {
      this.ensurePhonesDistinct(
        primaryPhoneNormalized,
        secondaryPhoneNormalized,
      );
    } catch (error) {
      return {
        success: false,
        reason:
          error instanceof BadRequestException
            ? error.message
            : 'Secondary phone must not match primary phone',
      };
    }

    const email = this.resolveImportEmail(row.email);

    if (email === 'invalid') {
      return { success: false, reason: 'Invalid email' };
    }

    if (!row.allowDuplicates) {
      const duplicateWarning = await this.detectDuplicates(
        tenantId,
        primaryPhoneNormalized,
        secondaryPhoneNormalized,
        SYSTEM_LEAD_SCOPE,
      );

      if (duplicateWarning) {
        return {
          success: false,
          reason: 'Duplicate of an existing lead',
          duplicate: true,
        };
      }
    }

    const notes = row.notes?.trim() || null;
    const projectIds = [...new Set(row.projectIds ?? [])];

    let leadId: string | null;
    try {
      leadId = await this.prisma.$transaction(async (tx) => {
        const allowed = await this.quotaService.canCreateLeadInTransaction(
          tx,
          tenantId,
        );

        if (!allowed) {
          return null;
        }

        const lead = await tx.lead.create({
          data: {
            tenantId,
            sourceId: row.sourceId ?? null,
            pipelineId: pipeline.pipelineId,
            pipelineStageId: pipeline.pipelineStageId,
            assignedUserId: assignee?.id ?? null,
            assignedAt: assignee ? new Date() : null,
            status: LeadStatus.OPEN,
            fullName,
            primaryPhone,
            primaryPhoneNormalized,
            secondaryPhone,
            secondaryPhoneNormalized,
            email,
            budgetMin: row.budgetMin ?? null,
            budgetMax: row.budgetMax ?? null,
            ...(row.customFields !== undefined
              ? { customFields: row.customFields }
              : {}),
            importJobId,
            importRowNumber: row.importRowNumber ?? null,
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

        if (notes) {
          await tx.leadNote.create({
            data: {
              tenantId,
              leadId: lead.id,
              authorId: actorUserId,
              content: notes,
            },
          });
        }

        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: lead.id,
            actorUserId,
            eventType: LeadActivityEventType.LEAD_CREATED,
            metadata: { source: 'import', importJobId },
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
    } catch (error) {
      // A retried job reached a row an earlier attempt already imported.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        row.importRowNumber !== undefined
      ) {
        const existing = await this.prisma.lead.findFirst({
          where: { importJobId, importRowNumber: row.importRowNumber },
          select: { id: true, assignedUserId: true },
        });

        if (existing) {
          return {
            success: true,
            leadId: existing.id,
            assignedUserId: existing.assignedUserId,
            alreadyImported: true,
          };
        }
      }

      throw error;
    }

    if (leadId === null) {
      return { success: false, reason: 'Lead quota exceeded' };
    }

    return { success: true, leadId, assignedUserId: assignee?.id ?? null };
  }

  async updateLead(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: UpdateLeadDto,
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

    const customFields =
      dto.customFields !== undefined
        ? await this.customFieldsService.resolveLeadValues(
            tenantId,
            existing.customFields,
            dto.customFields,
            { creating: false },
          )
        : undefined;

    await this.prisma.$transaction(async (tx) => {
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
          ...(customFields !== undefined ? { customFields } : {}),
        },
      });

      if (statusChange) {
        await this.recordStatusChange(
          tx,
          tenantId,
          actorUserId,
          existing.id,
          statusChange,
        );
      }

      if (dto.projectInterests !== undefined) {
        await tx.leadProjectInterest.deleteMany({
          where: { leadId: existing.id },
        });

        if (dto.projectInterests.length > 0) {
          await tx.leadProjectInterest.createMany({
            data: dto.projectInterests.map((interest) => ({
              leadId: existing.id,
              projectId: interest.projectId,
              interestLevel: interest.interestLevel ?? null,
            })),
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

  async archiveLead(
    id: string,
    tenantId: string,
    actorUserId: string,
    scope: LeadScope,
  ): Promise<LeadMutationResult> {
    return this.setStatus(
      id,
      tenantId,
      actorUserId,
      LeadStatus.ARCHIVED,
      scope,
    );
  }

  async restoreLead(
    id: string,
    tenantId: string,
    actorUserId: string,
    scope: LeadScope,
  ): Promise<LeadMutationResult> {
    return this.setStatus(id, tenantId, actorUserId, LeadStatus.OPEN, scope);
  }

  /** Soft delete. Requires lead.delete (checked by the controller). */
  async deleteLead(
    id: string,
    tenantId: string,
    actorUserId: string,
    scope: LeadScope,
  ): Promise<{ id: string }> {
    const existing = await this.getLeadOrThrow(id, tenantId, scope);

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: existing.id },
        data: { deletedAt: new Date(), nextFollowUpAt: null },
      });
      await this.cancelOpenFollowUps(tx, tenantId, existing.id);
      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: LEAD_AUDIT_ACTIONS.DELETED,
        entityType: AUDIT_ENTITY_TYPES.LEAD,
        entityId: existing.id,
        metadata: { fullName: existing.fullName },
        tx,
      });
    });

    void this.domainEventBus.publish(
      new LeadUpdatedEvent(tenantId, existing.id),
    );

    return { id: existing.id };
  }

  private async setStatus(
    id: string,
    tenantId: string,
    actorUserId: string,
    status: LeadStatus,
    scope: LeadScope,
  ): Promise<LeadMutationResult> {
    const existing = await this.getLeadOrThrow(id, tenantId, scope);

    if (existing.status === status) {
      throw new BadRequestException(
        status === LeadStatus.ARCHIVED
          ? 'Lead is already archived'
          : 'Lead is not archived',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: existing.id }, data: { status } });
      await this.recordStatusChange(
        tx,
        tenantId,
        actorUserId,
        existing.id,
        status,
      );
    });

    const lead = await this.getLeadOrThrow(
      existing.id,
      tenantId,
      SYSTEM_LEAD_SCOPE,
    );
    void this.domainEventBus.publish(
      new LeadUpdatedEvent(tenantId, existing.id),
    );

    return { lead: toLeadResponse(lead), duplicateWarning: null };
  }

  /**
   * Timeline + audit for archive/restore. Archiving also cancels open
   * follow-ups so nobody gets reminders for a parked lead.
   */
  private async recordStatusChange(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    leadId: string,
    status: LeadStatus,
  ): Promise<void> {
    const archived = status === LeadStatus.ARCHIVED;

    await this.leadActivityService.createActivity(
      {
        tenantId,
        leadId,
        actorUserId,
        eventType: archived
          ? LeadActivityEventType.STATUS_ARCHIVED
          : LeadActivityEventType.STATUS_RESTORED,
      },
      tx,
    );

    if (archived) {
      await this.cancelOpenFollowUps(tx, tenantId, leadId);
    }

    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action: archived
        ? LEAD_AUDIT_ACTIONS.ARCHIVED
        : LEAD_AUDIT_ACTIONS.RESTORED,
      entityType: AUDIT_ENTITY_TYPES.LEAD,
      entityId: leadId,
      tx,
    });
  }

  private async cancelOpenFollowUps(
    tx: Prisma.TransactionClient,
    tenantId: string,
    leadId: string,
  ): Promise<void> {
    await tx.task.updateMany({
      where: { tenantId, leadId, status: TaskStatus.OPEN, deletedAt: null },
      data: { status: TaskStatus.CANCELLED },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt: null },
    });
  }

  buildLeadsOrderBy(
    sortBy?: string,
    sortOrder?: SortOrder,
  ): Prisma.LeadOrderByWithRelationInput {
    return buildOrderBy(sortBy, sortOrder, LEAD_SORT_CONFIG);
  }

  /**
   * Single choke point for lead list/export filtering. Scope, stale and search
   * conditions each use OR internally, so they are combined under AND to
   * avoid one silently overwriting another.
   */
  buildLeadsWhereInput(
    tenantId: string,
    filters: LeadListFilters,
    scope: LeadScope,
  ): Prisma.LeadWhereInput {
    const search = normalizeSearch(filters.search);
    const and: Prisma.LeadWhereInput[] = [leadScopeWhere(scope)];

    if (filters.staleOnly) {
      and.push(this.buildStaleLeadWhereInput());
    }

    if (filters.neverContacted) {
      and.push({
        status: LeadStatus.OPEN,
        pipelineStage: { isClosed: false },
        firstContactedAt: null,
      });
    }

    if (filters.slaBreached) {
      and.push({
        status: LeadStatus.OPEN,
        slaBreachedAt: { not: null },
        firstContactedAt: null,
      });
    }

    if (filters.noFollowUp) {
      and.push({
        status: LeadStatus.OPEN,
        pipelineStage: { isClosed: false },
        nextFollowUpAt: null,
      });
    }

    if (search) {
      and.push({
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { primaryPhone: { contains: search, mode: 'insensitive' } },
          { secondaryPhone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

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
      ...(filters.projectId
        ? {
            leadProjectInterests: {
              some: { projectId: filters.projectId },
            },
          }
        : {}),
      ...(filters.unassignedOnly
        ? {
            status: LeadStatus.OPEN,
            pipelineStage: { isClosed: false },
            assignedUserId: null,
          }
        : {}),
      AND: and,
    };
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
    scope: LeadScope,
  ): Prisma.LeadWhereInput {
    return this.buildLeadsWhereInput(
      tenantId,
      {
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
        neverContacted: query.neverContacted,
        noFollowUp: query.noFollowUp,
        slaBreached: query.slaBreached,
      },
      scope,
    );
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
      select: { id: true },
    });

    if (!stage) {
      throw new BadRequestException(
        'Pipeline stage not found or does not belong to pipeline',
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

  /**
   * Who a newly created lead is assigned to. Actors without lead.assign always
   * own what they create; scoped actors can only assign inside their scope.
   */
  private resolveCreateAssigneeId(
    requestedUserId: string | null | undefined,
    actorUserId: string,
    access: LeadActorAccess,
  ): string | null | undefined {
    if (!access.canAssign || access.scope.kind === 'own') {
      return actorUserId;
    }

    if (requestedUserId && !isAssigneeInScope(access.scope, requestedUserId)) {
      throw new ForbiddenException(
        'You can only assign leads to members of your team',
      );
    }

    return requestedUserId;
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

    // Matches outside the actor's scope only reveal who owns the lead, never
    // the lead itself, so agents can't harvest colleagues' clients.
    return {
      detected: true,
      matches: matches.map((match) => {
        const accessible = isAssigneeInScope(scope, match.assignedUserId);

        return {
          id: accessible ? match.id : null,
          fullName: accessible ? match.fullName : null,
          ownerName: match.assignedUser?.name ?? null,
          accessible,
        };
      }),
    };
  }
}
