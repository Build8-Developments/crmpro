import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FileAssetCategory,
  LeadActivityEventType,
  Prisma,
} from '@prisma/client';
import { StorageLoggingService } from '../../common/logging/storage-logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { AutomationTriggerService } from '../automation/automation-trigger.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import {
  DOWNLOAD_URL_EXPIRY_SECONDS,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  UPLOAD_INTENT_TTL_SECONDS,
} from './files.constants';
import {
  CompleteUploadResponse,
  DownloadUrlResponse,
  LeadAttachmentSummary,
  RequestUploadResponse,
} from './types/file.types';
import {
  generateExportObjectKey,
  generateUploadObjectKey,
  isObjectKeyForTenant,
} from './utils/file-key.util';

const fileAssetSelect = {
  id: true,
  category: true,
  objectKey: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  leadId: true,
  createdAt: true,
} satisfies Prisma.FileAssetSelect;

type FileAssetRecord = Prisma.FileAssetGetPayload<{
  select: typeof fileAssetSelect;
}>;

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly leadActivityService: LeadActivityService,
    private readonly storageLoggingService: StorageLoggingService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly automationTrigger: AutomationTriggerService,
  ) {}

  async requestUpload(
    tenantId: string,
    userId: string,
    dto: RequestUploadDto,
  ): Promise<RequestUploadResponse> {
    const startedAt = Date.now();

    try {
      if (dto.sizeBytes > MAX_UPLOAD_FILE_SIZE_BYTES) {
        throw new BadRequestException('File exceeds maximum size of 25 MB');
      }

      await this.validateTenantQuota(tenantId, dto.sizeBytes);

      const objectKey = generateUploadObjectKey(tenantId, dto.fileName);
      const expiresAt = new Date(Date.now() + UPLOAD_INTENT_TTL_SECONDS * 1000);

      await this.prisma.fileUploadIntent.create({
        data: {
          tenantId,
          userId,
          objectKey,
          originalFilename: dto.fileName.trim(),
          mimeType: dto.contentType,
          sizeBytes: BigInt(dto.sizeBytes),
          expiresAt,
        },
      });

      const signed = await this.storageService.getSignedUploadUrl({
        key: objectKey,
        contentType: dto.contentType,
        expiresInSeconds: UPLOAD_INTENT_TTL_SECONDS,
      });

      this.storageLoggingService.uploadRequested({
        tenantId,
        userId,
        sizeBytes: dto.sizeBytes,
        durationMs: Date.now() - startedAt,
      });

      return {
        uploadUrl: signed.url,
        objectKey: signed.key,
        expiresInSeconds: signed.expiresInSeconds,
      };
    } catch (error) {
      this.storageLoggingService.uploadFailed({
        tenantId,
        userId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async completeUpload(
    tenantId: string,
    userId: string,
    dto: CompleteUploadDto,
  ): Promise<CompleteUploadResponse> {
    const startedAt = Date.now();

    try {
      if (!isObjectKeyForTenant(dto.objectKey, tenantId)) {
        throw new BadRequestException('Invalid object key for tenant');
      }

    const intent = await this.prisma.fileUploadIntent.findFirst({
      where: {
        objectKey: dto.objectKey,
        tenantId,
        userId,
      },
    });

    if (!intent) {
      throw new BadRequestException('Upload intent not found or expired');
    }

    if (intent.expiresAt < new Date()) {
      await this.prisma.fileUploadIntent.delete({ where: { id: intent.id } });
      throw new BadRequestException('Upload intent expired');
    }

    const verified = await this.verifyUploadedObject(intent.objectKey, intent);

    await this.validateTenantQuota(tenantId, verified.sizeBytes);

    if (dto.category === FileAssetCategory.LEAD_ATTACHMENT && dto.leadId) {
      await this.validateLeadForAttachment(dto.leadId, tenantId);
    }

    if (
      dto.category === FileAssetCategory.LEAD_ATTACHMENT &&
      !dto.leadId
    ) {
      throw new BadRequestException(
        'leadId is required when category is LEAD_ATTACHMENT',
      );
    }

    const leadId =
      dto.category === FileAssetCategory.LEAD_ATTACHMENT
        ? (dto.leadId ?? null)
        : null;

    const file = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fileAsset.create({
        data: {
          tenantId,
          uploadedByUserId: userId,
          category: dto.category,
          objectKey: intent.objectKey,
          originalFilename: intent.originalFilename,
          mimeType: intent.mimeType,
          sizeBytes: BigInt(verified.sizeBytes),
          leadId,
        },
        select: fileAssetSelect,
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          storageUsedBytes: { increment: BigInt(verified.sizeBytes) },
        },
      });

      await tx.fileUploadIntent.delete({ where: { id: intent.id } });

      if (leadId) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId,
            actorUserId: userId,
            eventType: LeadActivityEventType.FILE_ATTACHED,
            metadata: {
              fileId: created.id,
              category: dto.category,
            },
          },
          tx,
        );
      }

      return created;
    });

    this.storageLoggingService.uploadCompleted({
      tenantId,
      userId,
      fileId: file.id,
      sizeBytes: Number(file.sizeBytes),
      durationMs: Date.now() - startedAt,
    });

    void this.automationTrigger.onFileUploaded({
      tenantId,
      fileId: file.id,
    });

    return this.toCompleteUploadResponse(file);
    } catch (error) {
      this.storageLoggingService.uploadFailed({
        tenantId,
        userId,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getDownloadUrl(
    fileId: string,
    tenantId: string,
    options?: { expiresInSeconds?: number },
  ): Promise<DownloadUrlResponse> {
    const startedAt = Date.now();
    const file = await this.getFileOrThrow(fileId, tenantId);

    const signed = await this.storageService.getSignedDownloadUrl({
      objectKey: file.objectKey,
      expiresInSeconds:
        options?.expiresInSeconds ?? DOWNLOAD_URL_EXPIRY_SECONDS,
    });

    this.storageLoggingService.downloadUrlGenerated({
      tenantId,
      fileId,
      durationMs: Date.now() - startedAt,
    });

    return {
      downloadUrl: signed.url,
      expiresInSeconds: signed.expiresInSeconds,
    };
  }

  async createServerGeneratedFile(params: {
    tenantId: string;
    userId: string;
    category: FileAssetCategory;
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }): Promise<{ id: string; objectKey: string; originalFilename: string }> {
    const sizeBytes = params.buffer.byteLength;

    if (sizeBytes <= 0) {
      throw new BadRequestException('File content is empty');
    }

    await this.validateTenantQuota(params.tenantId, sizeBytes);

    const objectKey = generateExportObjectKey(params.tenantId, params.fileName);
    const originalFilename = params.fileName.trim();

    await this.storageService.uploadFile({
      key: objectKey,
      buffer: params.buffer,
      contentType: params.mimeType,
    });

    const file = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fileAsset.create({
        data: {
          tenantId: params.tenantId,
          uploadedByUserId: params.userId,
          category: params.category,
          objectKey,
          originalFilename,
          mimeType: params.mimeType,
          sizeBytes: BigInt(sizeBytes),
          leadId: null,
        },
        select: {
          id: true,
          objectKey: true,
          originalFilename: true,
        },
      });

      await tx.tenant.update({
        where: { id: params.tenantId },
        data: {
          storageUsedBytes: { increment: BigInt(sizeBytes) },
        },
      });

      return created;
    });

    return file;
  }

  async deleteFile(
    fileId: string,
    tenantId: string,
    userId: string,
  ): Promise<{ id: string }> {
    const startedAt = Date.now();
    const file = await this.getFileOrThrow(fileId, tenantId);

    await this.prisma.$transaction(async (tx) => {
      await tx.fileAsset.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          storageUsedBytes: { decrement: file.sizeBytes },
        },
      });

      if (file.leadId) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: file.leadId,
            actorUserId: userId,
            eventType: LeadActivityEventType.FILE_DELETED,
            metadata: { fileId: file.id },
          },
          tx,
        );
      }
    });

    try {
      await this.storageService.deleteFile(file.objectKey);
    } catch {
      // DB is source of truth; orphaned S3 objects can be garbage-collected later.
    }

    this.storageLoggingService.fileDeleted({
      tenantId,
      userId,
      fileId: file.id,
      durationMs: Date.now() - startedAt,
    });

    if (file.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: file.leadId, tenantId, deletedAt: null },
        select: { assignedUserId: true },
      });

      if (lead?.assignedUserId && lead.assignedUserId !== userId) {
        void this.notificationTrigger.notifyFileDeleted({
          tenantId,
          recipientUserId: lead.assignedUserId,
          fileId: file.id,
          fileName: file.originalFilename,
          actorUserId: userId,
        });
      }
    }

    return { id: file.id };
  }

  async listLeadAttachments(
    leadId: string,
    tenantId: string,
  ): Promise<{ items: LeadAttachmentSummary[] }> {
    await this.validateLeadForAttachment(leadId, tenantId);

    const files = await this.prisma.fileAsset.findMany({
      where: {
        tenantId,
        leadId,
        deletedAt: null,
        category: FileAssetCategory.LEAD_ATTACHMENT,
      },
      orderBy: { createdAt: 'desc' },
      select: fileAssetSelect,
    });

    return {
      items: files.map((file) => this.toAttachmentSummary(file)),
    };
  }

  private async validateTenantQuota(
    tenantId: string,
    sizeBytes: number,
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        storageUsedBytes: true,
        subscriptionPlan: { select: { maxStorageBytes: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const projected =
      tenant.storageUsedBytes + BigInt(sizeBytes);

    if (projected > tenant.subscriptionPlan.maxStorageBytes) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }

  private async verifyUploadedObject(
    objectKey: string,
    intent: { sizeBytes: bigint; mimeType: string },
  ): Promise<{ sizeBytes: number }> {
    const object = await this.storageService.headObject(objectKey);

    if (!object) {
      throw new BadRequestException('Upload not completed');
    }

    const declaredSize = Number(intent.sizeBytes);
    const actualSize = object.contentLength;

    if (actualSize <= 0) {
      throw new BadRequestException('Upload not completed');
    }

    if (actualSize > declaredSize) {
      throw new BadRequestException(
        `Uploaded file exceeds declared size (declared ${declaredSize}, uploaded ${actualSize})`,
      );
    }

    if (
      object.contentType &&
      object.contentType.toLowerCase() !== intent.mimeType.toLowerCase()
    ) {
      throw new BadRequestException(
        `Uploaded file content type mismatch (expected ${intent.mimeType}, got ${object.contentType})`,
      );
    }

    return { sizeBytes: actualSize };
  }

  private async validateLeadForAttachment(
    leadId: string,
    tenantId: string,
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!lead) {
      throw new BadRequestException('Lead not found');
    }
  }

  private async getFileOrThrow(
    fileId: string,
    tenantId: string,
  ): Promise<FileAssetRecord & { sizeBytes: bigint }> {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId, deletedAt: null },
      select: fileAssetSelect,
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  private toCompleteUploadResponse(
    file: FileAssetRecord,
  ): CompleteUploadResponse {
    return {
      id: file.id,
      category: file.category,
      objectKey: file.objectKey,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
      leadId: file.leadId,
      createdAt: file.createdAt,
    };
  }

  private toAttachmentSummary(file: FileAssetRecord): LeadAttachmentSummary {
    return {
      id: file.id,
      category: file.category,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes.toString(),
      createdAt: file.createdAt,
    };
  }
}
