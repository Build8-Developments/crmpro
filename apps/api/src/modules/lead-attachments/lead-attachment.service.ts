import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FileAssetCategory,
  LeadActivityEventType,
  Prisma,
} from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { LeadAttachmentSummary } from './lead-attachment.types';
import { type LeadScope, leadScopeWhere } from '../../common/auth';

const attachmentSelect = {
  id: true,
  category: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
  interaction: {
    select: { id: true, channel: true, outcome: true, occurredAt: true },
  },
} satisfies Prisma.FileAssetSelect;

type AttachmentRecord = Prisma.FileAssetGetPayload<{
  select: typeof attachmentSelect;
}>;

@Injectable()
export class LeadAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  async validateAttachmentTarget(
    leadId: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: { id: true },
    });

    if (!lead) {
      throw new BadRequestException('Lead not found');
    }
  }

  async listAttachments(
    leadId: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<{ items: LeadAttachmentSummary[] }> {
    await this.validateAttachmentTarget(leadId, tenantId, scope);

    const files = await this.prisma.fileAsset.findMany({
      where: {
        tenantId,
        leadId,
        deletedAt: null,
        category: FileAssetCategory.LEAD_ATTACHMENT,
      },
      orderBy: { createdAt: 'desc' },
      select: attachmentSelect,
    });

    return {
      items: files.map((file) => this.toAttachmentSummary(file)),
    };
  }

  async recordFileAttached(
    params: {
      tenantId: string;
      leadId: string;
      actorUserId: string;
      fileId: string;
      category: FileAssetCategory;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.leadActivityService.createActivity(
      {
        tenantId: params.tenantId,
        leadId: params.leadId,
        actorUserId: params.actorUserId,
        eventType: LeadActivityEventType.FILE_ATTACHED,
        metadata: {
          fileId: params.fileId,
          category: params.category,
        },
      },
      tx,
    );
  }

  async recordFileDeleted(
    params: {
      tenantId: string;
      leadId: string;
      actorUserId: string;
      fileId: string;
    },
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.leadActivityService.createActivity(
      {
        tenantId: params.tenantId,
        leadId: params.leadId,
        actorUserId: params.actorUserId,
        eventType: LeadActivityEventType.FILE_DELETED,
        metadata: { fileId: params.fileId },
      },
      tx,
    );
  }

  async getLeadAssigneeId(
    leadId: string,
    tenantId: string,
  ): Promise<string | null> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      select: { assignedUserId: true },
    });

    return lead?.assignedUserId ?? null;
  }

  private toAttachmentSummary(file: AttachmentRecord): LeadAttachmentSummary {
    return {
      id: file.id,
      category: file.category,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
      createdAt: file.createdAt,
      uploadedBy: file.uploadedBy,
      interaction: file.interaction,
    };
  }
}
