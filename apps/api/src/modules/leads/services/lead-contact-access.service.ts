import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadActivityEventType } from '@crmpro/database';
import type { ContactAccessAction, ContactField } from '@crmpro/shared/leads';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { AUDIT_ENTITY_TYPES } from '../../audit/audit.constants';
import { LeadActivityService } from './lead-activity.service';
import { type LeadScope, leadScopeWhere } from '../../../common/auth';

export const CONTACT_AUDIT_ACTION = 'LEAD_CONTACT_ACCESSED';

/**
 * Hands out a lead's real phone/email and records who looked at it, why
 * (reveal, copy, call, WhatsApp, edit) and when — on the lead timeline and
 * in the audit log. Everything else in the API only returns masked values.
 */
@Injectable()
export class LeadContactAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivity: LeadActivityService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async access(
    tenantId: string,
    actorUserId: string,
    leadId: string,
    field: ContactField,
    action: ContactAccessAction,
    scope: LeadScope,
  ): Promise<{ field: ContactField; value: string | null }> {
    // Only leads the user may see can have their contact revealed.
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: {
        id: true,
        primaryPhone: true,
        secondaryPhone: true,
        email: true,
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');

    const value = lead[field];
    if (value) {
      await this.prisma.$transaction(async (tx) => {
        await this.leadActivity.createActivity(
          {
            tenantId,
            leadId,
            actorUserId,
            eventType: LeadActivityEventType.CONTACT_ACCESSED,
            metadata: { field, action },
          },
          tx,
        );
        await this.auditWriter.createAuditLog({
          tenantId,
          actorUserId,
          action: CONTACT_AUDIT_ACTION,
          entityType: AUDIT_ENTITY_TYPES.LEAD,
          entityId: leadId,
          metadata: { field, action },
          tx,
        });
      });
    }
    return { field, value };
  }
}
