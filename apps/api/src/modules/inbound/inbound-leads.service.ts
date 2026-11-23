import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LeadActivityEventType, NotificationType } from '@crmpro/database';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedApiKey } from '../api-keys/types/api-key.types';
import { LeadsService } from '../leads/leads.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import type {
  DefaultPipelinePlacement,
  ImportLeadProfile,
  SystemLeadInput,
  SystemLeadOptions,
  SystemLeadResult,
} from '../leads/types/lead.types';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import { InboundLeadDto } from './dto/inbound-lead.dto';
import {
  INBOUND_MESSAGES,
  RESUBMISSION_NOTIFY_BUCKET_MS,
} from './inbound.constants';
import type { InboundLeadResult } from './types/inbound.types';
import { LeadManagersService } from '../workflow/rules/lead-managers.service';

type Duplicate = Extract<SystemLeadResult, { status: 'duplicate' }>;

/**
 * Lead intake for integrations. Creation goes through
 * LeadsService.createSystemLead (normalization, duplicates, quota, timeline,
 * rules engine). New leads stay unassigned: managers distribute them.
 *
 * Phone rule: a phone that belongs to an open lead never creates a second
 * lead; the client "came back", so the existing lead gets a timeline entry
 * and its owner (or the managers, if unassigned) a notification. A phone
 * that only matches closed leads is a new opportunity and creates a lead.
 */
@Injectable()
export class InboundLeadsService {
  private readonly logger = new Logger(InboundLeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly leadActivityService: LeadActivityService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly managers: LeadManagersService,
  ) {}

  async ingest(
    key: AuthenticatedApiKey,
    dto: InboundLeadDto,
    now: Date = new Date(),
  ): Promise<InboundLeadResult> {
    const tenantId = key.tenantId;
    const [placement, sourceId, projectIds] = await Promise.all([
      this.resolvePlacement(tenantId),
      this.resolveSourceId(tenantId, key.sourceId, dto.source),
      this.resolveProjectIds(tenantId, dto),
    ]);

    const row: SystemLeadInput = {
      fullName: dto.fullName,
      primaryPhone: dto.phone,
      secondaryPhone: dto.secondaryPhone ?? null,
      email: dto.email ?? null,
      sourceId,
      projectIds,
      message: dto.message ?? null,
      externalId: dto.externalId ?? null,
      profile: this.profile(dto),
    };
    const metadata = this.timelineMetadata(key, dto, sourceId, projectIds);

    const result = await this.createLead(tenantId, row, placement, metadata);

    if (result.status !== 'duplicate') {
      return this.toResult(result);
    }

    if (result.existingIsOpen) {
      return this.recordResubmission(key, dto, result, metadata, now);
    }

    // Only closed/lost leads have this phone: a returning client is a new
    // opportunity, linked to the previous lead on the timeline.
    const reopened = await this.createLead(
      tenantId,
      row,
      placement,
      {
        ...metadata,
        previousLeadId: result.existingLeadId,
      },
      'CREATE',
    );

    if (reopened.status === 'duplicate') {
      // Not reachable with duplicatePolicy CREATE; fail loudly if it ever is.
      throw new Error('createSystemLead reported a duplicate under CREATE');
    }
    return this.toResult(reopened);
  }

  private createLead(
    tenantId: string,
    row: SystemLeadInput,
    placement: DefaultPipelinePlacement,
    metadata: Record<string, unknown>,
    duplicatePolicy: SystemLeadOptions['duplicatePolicy'] = 'SKIP',
  ): Promise<SystemLeadResult> {
    return this.leadsService.createSystemLead(tenantId, row, placement, {
      origin: 'inbound',
      actorUserId: null,
      duplicatePolicy,
      metadata,
    });
  }

  private toResult(
    result: Exclude<SystemLeadResult, Duplicate>,
  ): InboundLeadResult {
    switch (result.status) {
      case 'created':
        return { leadId: result.leadId, status: 'created' };
      case 'already-created':
        return { leadId: result.leadId, status: 'duplicate_request' };
      case 'failed':
        throw new UnprocessableEntityException({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: result.reason,
        });
    }
  }

  private async recordResubmission(
    key: AuthenticatedApiKey,
    dto: InboundLeadDto,
    duplicate: Duplicate,
    metadata: Record<string, unknown>,
    now: Date,
  ): Promise<InboundLeadResult> {
    const tenantId = key.tenantId;
    const leadId = duplicate.existingLeadId;

    // A retried resubmission (same externalId) must not add a second entry.
    if (dto.externalId) {
      const seen = await this.prisma.leadActivity.findFirst({
        where: {
          tenantId,
          leadId,
          eventType: LeadActivityEventType.LEAD_RESUBMITTED,
          metadata: { path: ['externalId'], equals: dto.externalId },
        },
        select: { id: true },
      });
      if (seen) {
        return { leadId, status: 'duplicate_request' };
      }
    } else if (await this.isRepeatOfLatest(key, leadId, dto, now)) {
      // A form or Zap stuck in a retry loop: one entry per hour is enough.
      return { leadId, status: 'resubmitted' };
    }

    await this.leadActivityService.createActivity({
      tenantId,
      leadId,
      actorUserId: null,
      eventType: LeadActivityEventType.LEAD_RESUBMITTED,
      metadata: {
        ...metadata,
        submittedName: dto.fullName,
        ...(dto.message ? { message: dto.message.slice(0, 1000) } : {}),
        ...(dto.externalId ? { externalId: dto.externalId } : {}),
      },
    });

    try {
      await this.notifyResubmission(tenantId, leadId, key.name, now);
    } catch (error) {
      // The client's inquiry is recorded; a lost alert must not fail intake.
      this.logger.warn(
        `Resubmission notification failed for lead ${leadId}: ${
          (error as Error).message
        }`,
      );
    }

    return { leadId, status: 'resubmitted' };
  }

  /**
   * True when the lead's latest resubmission in the past hour came from the
   * same key with the same message (no externalId to tell retries apart).
   */
  private async isRepeatOfLatest(
    key: AuthenticatedApiKey,
    leadId: string,
    dto: InboundLeadDto,
    now: Date,
  ): Promise<boolean> {
    const latest = await this.prisma.leadActivity.findFirst({
      where: {
        tenantId: key.tenantId,
        leadId,
        eventType: LeadActivityEventType.LEAD_RESUBMITTED,
        createdAt: {
          gte: new Date(now.getTime() - RESUBMISSION_NOTIFY_BUCKET_MS),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
    });
    if (!latest) return false;

    const meta = (latest.metadata ?? {}) as Record<string, unknown>;
    const message = dto.message ? dto.message.slice(0, 1000) : undefined;
    return meta.apiKeyId === key.id && meta.message === message;
  }

  private async notifyResubmission(
    tenantId: string,
    leadId: string,
    keyName: string,
    now: Date,
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      select: {
        fullName: true,
        assignedUser: {
          select: { id: true, isActive: true, deletedAt: true },
        },
      },
    });
    if (!lead) return;

    const owner =
      lead.assignedUser?.isActive && !lead.assignedUser.deletedAt
        ? lead.assignedUser.id
        : null;
    const recipients = owner
      ? [owner]
      : await this.managers.distributors(tenantId);
    const bucket = Math.floor(now.getTime() / RESUBMISSION_NOTIFY_BUCKET_MS);

    for (const recipientUserId of recipients) {
      await this.notificationTrigger.trigger({
        tenantId,
        recipientUserId,
        type: NotificationType.ESCALATION,
        metadata: {
          kind: 'lead_resubmitted',
          title: owner
            ? 'Your client came back'
            : 'An unassigned client came back',
          message: owner
            ? `${lead.fullName} sent a new inquiry (${keyName}). Follow up while they're interested.`
            : `${lead.fullName} sent a new inquiry (${keyName}) and has no owner yet. Assign the lead.`,
          leadId,
          leadName: lead.fullName,
        },
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'lead',
          entityId: leadId,
          type: NotificationType.ESCALATION,
          recipientUserId,
          suffix: `resubmitted:${bucket}`,
        }),
      });
    }
  }

  private async resolvePlacement(
    tenantId: string,
  ): Promise<DefaultPipelinePlacement> {
    try {
      return await this.leadsService.getDefaultPipelinePlacement(tenantId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new UnprocessableEntityException({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: INBOUND_MESSAGES.NO_PIPELINE,
        });
      }
      throw error;
    }
  }

  /** The key's source wins; otherwise an existing source matched by name. */
  private async resolveSourceId(
    tenantId: string,
    keySourceId: string | null,
    sourceName: string | undefined,
  ): Promise<string | null> {
    if (keySourceId) {
      const source = await this.prisma.leadSource.findFirst({
        where: { id: keySourceId, tenantId },
        select: { id: true },
      });
      // A deleted source must not block intake: fall back to the payload.
      if (source) return source.id;
    }
    if (!sourceName) return null;

    const source = await this.prisma.leadSource.findFirst({
      where: { tenantId, name: { equals: sourceName, mode: 'insensitive' } },
      select: { id: true },
    });
    return source?.id ?? null;
  }

  /** Explicit ids are validated by createSystemLead; names are best effort. */
  private async resolveProjectIds(
    tenantId: string,
    dto: InboundLeadDto,
  ): Promise<string[]> {
    if (dto.projectIds?.length) return dto.projectIds;
    if (!dto.projectName) return [];

    const project = await this.prisma.project.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: dto.projectName, mode: 'insensitive' },
      },
      select: { id: true },
    });
    return project ? [project.id] : [];
  }

  private profile(dto: InboundLeadDto): ImportLeadProfile | undefined {
    const profile: ImportLeadProfile = {
      occupation: dto.occupation,
      residenceArea: dto.residenceArea,
      paymentPreference: dto.paymentPreference,
      contactChannelPreference: dto.contactChannelPreference,
      contactTimePreference: dto.contactTimePreference,
      purchasePurpose: dto.purchasePurpose,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
    };
    const present = Object.fromEntries(
      Object.entries(profile).filter(([, value]) => value !== undefined),
    ) as ImportLeadProfile;
    return Object.keys(present).length > 0 ? present : undefined;
  }

  /** What the timeline shows about where the lead came from. */
  private timelineMetadata(
    key: AuthenticatedApiKey,
    dto: InboundLeadDto,
    sourceId: string | null,
    projectIds: string[],
  ): Record<string, unknown> {
    const utm = Object.fromEntries(
      Object.entries({
        source: dto.utmSource,
        medium: dto.utmMedium,
        campaign: dto.utmCampaign,
        term: dto.utmTerm,
        content: dto.utmContent,
      }).filter(([, value]) => value !== undefined),
    );

    return {
      channel: 'api',
      apiKeyId: key.id,
      apiKeyName: key.name,
      ...(Object.keys(utm).length > 0 ? { utm } : {}),
      // Kept when they did not match anything, so nothing the form sent is lost.
      ...(dto.source && !sourceId ? { submittedSource: dto.source } : {}),
      ...(dto.projectName && projectIds.length === 0
        ? { submittedProject: dto.projectName }
        : {}),
    };
  }
}
