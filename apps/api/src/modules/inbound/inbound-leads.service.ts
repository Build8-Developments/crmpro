import { Injectable } from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  NotificationType,
  Prisma,
} from '@crmpro/database';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import {
  LeadCreatedEvent,
  LeadUpdatedEvent,
} from '../../common/events/domain-event.types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuotaService } from '../../common/quota/quota.service';
import { normalizeDisplayName } from '../../common/utils/name-normalization.util';
import {
  normalizePhone,
  phoneMatchVariants,
} from '../../common/utils/phone-normalization.util';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import { InboundLeadDto } from './dto/inbound-lead.dto';

export interface InboundLeadResult {
  leadId: string;
  /** true when the phone/externalId matched an existing lead. */
  duplicate: boolean;
}

/**
 * Lead intake for integrations. Ownership rule: a phone number that already
 * belongs to an open lead never creates a second lead — the existing owner
 * keeps it and is told the client came back.
 */
@Injectable()
export class InboundLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly leadActivityService: LeadActivityService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async ingest(
    tenantId: string,
    apiKeyId: string,
    dto: InboundLeadDto,
  ): Promise<InboundLeadResult> {
    if (dto.externalId) {
      const known = await this.prisma.lead.findFirst({
        where: { tenantId, externalId: dto.externalId },
        select: { id: true },
      });

      if (known) {
        return { leadId: known.id, duplicate: true };
      }
    }

    const phone = normalizePhone(dto.phone);
    const secondary = dto.secondaryPhone
      ? normalizePhone(dto.secondaryPhone)
      : null;
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { defaultCountryCode: true },
    });
    // Ad platforms send "+2010…" while agents type "010…": same client.
    const phones = [
      ...new Set(
        (secondary ? [phone, secondary] : [phone]).flatMap((value) =>
          phoneMatchVariants(value, settings?.defaultCountryCode),
        ),
      ),
    ];
    const existing = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        status: LeadStatus.OPEN,
        OR: phones.flatMap((value) => [
          { primaryPhoneNormalized: value },
          { secondaryPhoneNormalized: value },
        ]),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fullName: true, assignedUserId: true },
    });

    const context = {
      channel: 'api',
      apiKeyId,
      ...(dto.source ? { source: dto.source } : {}),
      ...(dto.campaign ? { campaign: dto.campaign } : {}),
      ...(dto.project ? { project: dto.project } : {}),
      ...(dto.metadata ? { metadata: dto.metadata } : {}),
    } as Prisma.InputJsonValue;

    if (existing) {
      await this.recordResubmission(tenantId, existing, dto, context);
      return { leadId: existing.id, duplicate: true };
    }

    return {
      leadId: await this.createLead(tenantId, dto, phone, secondary, context),
      duplicate: false,
    };
  }

  private async recordResubmission(
    tenantId: string,
    lead: { id: string; fullName: string; assignedUserId: string | null },
    dto: InboundLeadDto,
    context: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.leadActivityService.createActivity(
        {
          tenantId,
          leadId: lead.id,
          actorUserId: null,
          eventType: LeadActivityEventType.LEAD_RESUBMITTED,
          metadata: {
            ...(context as Record<string, unknown>),
            ...(dto.note ? { note: dto.note } : {}),
            submittedName: dto.fullName,
          },
        },
        tx,
      );
      await tx.lead.update({
        where: { id: lead.id },
        data: { updatedAt: new Date() },
      });
    });

    void this.eventBus.publish(new LeadUpdatedEvent(tenantId, lead.id));

    if (lead.assignedUserId) {
      void this.notificationTrigger.trigger({
        tenantId,
        recipientUserId: lead.assignedUserId,
        type: NotificationType.LEAD_RESUBMITTED,
        metadata: {
          leadId: lead.id,
          leadName: lead.fullName,
          title: 'Your lead came back',
          message: `${lead.fullName} submitted a new inquiry${dto.source ? ` via ${dto.source}` : ''}${dto.campaign ? ` (${dto.campaign})` : ''}.`,
        },
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'lead',
          entityId: lead.id,
          type: NotificationType.LEAD_RESUBMITTED,
          recipientUserId: lead.assignedUserId,
          suffix: String(Math.floor(Date.now() / 3_600_000)),
        }),
      });
    }
  }

  private async createLead(
    tenantId: string,
    dto: InboundLeadDto,
    phone: string,
    secondary: string | null,
    context: Prisma.InputJsonValue,
  ): Promise<string> {
    const [pipeline, sourceId, projectId] = await Promise.all([
      this.prisma.pipeline.findFirst({
        where: { tenantId, isDefault: true },
        select: {
          id: true,
          stages: {
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.resolveSource(tenantId, dto.source),
      this.resolveProject(tenantId, dto.project),
    ]);

    if (!pipeline?.stages.length) {
      throw new Error('Default pipeline is not configured');
    }

    const leadId = await this.prisma.$transaction(async (tx) => {
      await this.quotaService.assertCanCreateLeadInTransaction(tx, tenantId);

      const lead = await tx.lead.create({
        data: {
          tenantId,
          sourceId,
          pipelineId: pipeline.id,
          pipelineStageId: pipeline.stages[0].id,
          status: LeadStatus.OPEN,
          fullName: normalizeDisplayName(dto.fullName),
          primaryPhone: dto.phone.trim(),
          primaryPhoneNormalized: phone,
          secondaryPhone: dto.secondaryPhone?.trim() || null,
          secondaryPhoneNormalized: secondary,
          email: dto.email?.toLowerCase() ?? null,
          budgetMin: dto.budgetMin ?? null,
          budgetMax: dto.budgetMax ?? null,
          externalId: dto.externalId ?? null,
          notesSummary: dto.note ?? null,
        },
        select: { id: true },
      });

      if (projectId) {
        await tx.leadProjectInterest.create({
          data: { leadId: lead.id, projectId },
        });
      }

      await this.leadActivityService.createActivity(
        {
          tenantId,
          leadId: lead.id,
          actorUserId: null,
          eventType: LeadActivityEventType.LEAD_CREATED,
          metadata: {
            ...(context as Record<string, unknown>),
            source: 'api',
            ...(dto.note ? { note: dto.note } : {}),
          },
        },
        tx,
      );

      return lead.id;
    });

    // Auto-assignment (if enabled) listens to this event.
    void this.eventBus.publish(new LeadCreatedEvent(tenantId, leadId));
    return leadId;
  }

  private async resolveSource(
    tenantId: string,
    name: string | undefined,
  ): Promise<string | null> {
    if (!name) {
      return null;
    }

    const existing = await this.prisma.leadSource.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.leadSource
      .create({ data: { tenantId, name }, select: { id: true } })
      .catch(async () =>
        // Another request created it concurrently.
        this.prisma.leadSource.findFirst({
          where: { tenantId, name: { equals: name, mode: 'insensitive' } },
          select: { id: true },
        }),
      );

    return created?.id ?? null;
  }

  private async resolveProject(
    tenantId: string,
    name: string | undefined,
  ): Promise<string | null> {
    if (!name) {
      return null;
    }

    const project = await this.prisma.project.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true },
    });

    return project?.id ?? null;
  }
}
