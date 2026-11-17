import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FileAssetCategory, TenantSettings } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

export const TENANT_SETTINGS_AUDIT_ACTION = 'TENANT_SETTINGS_UPDATED';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_URL_TTL_SECONDS = 6 * 60 * 60;

export type TenantSettingsView = TenantSettings & {
  workspaceName: string;
  logoUrl: string | null;
};

function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class TenantSettingsService {
  private readonly logger = new Logger(TenantSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly storage: StorageService,
  ) {}

  /** Settings row, created with defaults on first access. */
  async get(tenantId: string): Promise<TenantSettings> {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });
  }

  /** Settings plus workspace name and a short-lived logo URL, for the UI. */
  async getView(tenantId: string): Promise<TenantSettingsView> {
    const [settings, tenant] = await Promise.all([
      this.get(tenantId),
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { name: true },
      }),
    ]);

    return {
      ...settings,
      workspaceName: tenant.name,
      logoUrl: await this.getLogoUrl(tenantId, settings.logoFileAssetId),
    };
  }

  async getLogoUrl(
    tenantId: string,
    logoFileAssetId?: string | null,
  ): Promise<string | null> {
    const fileId =
      logoFileAssetId === undefined
        ? (
            await this.prisma.tenantSettings.findUnique({
              where: { tenantId },
              select: { logoFileAssetId: true },
            })
          )?.logoFileAssetId
        : logoFileAssetId;

    if (!fileId) {
      return null;
    }

    const file = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId, deletedAt: null },
      select: { objectKey: true },
    });

    if (!file) {
      return null;
    }

    try {
      const signed = await this.storage.getSignedDownloadUrl({
        objectKey: file.objectKey,
        expiresInSeconds: LOGO_URL_TTL_SECONDS,
      });
      return signed.url;
    } catch (error) {
      this.logger.warn(`Logo URL unavailable: ${(error as Error).message}`);
      return null;
    }
  }

  async update(
    tenantId: string,
    actorUserId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsView> {
    if (dto.timezone !== undefined && !isValidTimeZone(dto.timezone)) {
      throw new BadRequestException('Unknown timezone');
    }

    const previous = await this.get(tenantId);

    if (dto.logoFileAssetId) {
      await this.assertLogoFile(tenantId, dto.logoFileAssetId);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.workspaceName !== undefined) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { name: dto.workspaceName },
        });
      }

      await tx.tenantSettings.update({
        where: { tenantId },
        data: {
          ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
          ...(dto.defaultCountryCode !== undefined
            ? { defaultCountryCode: dto.defaultCountryCode }
            : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.defaultLocale !== undefined
            ? { defaultLocale: dto.defaultLocale }
            : {}),
          ...(dto.autoAssignEnabled !== undefined
            ? { autoAssignEnabled: dto.autoAssignEnabled }
            : {}),
          ...(dto.slaFirstResponseMinutes !== undefined
            ? { slaFirstResponseMinutes: dto.slaFirstResponseMinutes }
            : {}),
          ...(dto.slaAction !== undefined ? { slaAction: dto.slaAction } : {}),
          ...(dto.logoFileAssetId !== undefined
            ? { logoFileAssetId: dto.logoFileAssetId }
            : {}),
        },
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: TENANT_SETTINGS_AUDIT_ACTION,
        entityType: 'TenantSettings',
        entityId: tenantId,
        metadata: {
          changed: Object.keys(dto).filter(
            (key) =>
              dto[key as keyof UpdateTenantSettingsDto] !==
              previous[key as keyof TenantSettings],
          ),
        },
        tx,
      });
    });

    return this.getView(tenantId);
  }

  private async assertLogoFile(
    tenantId: string,
    fileId: string,
  ): Promise<void> {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId, deletedAt: null },
      select: { category: true, mimeType: true, sizeBytes: true },
    });

    if (
      !file ||
      file.category !== FileAssetCategory.TENANT_LOGO ||
      !file.mimeType.startsWith('image/') ||
      file.sizeBytes > BigInt(MAX_LOGO_BYTES)
    ) {
      throw new BadRequestException(
        'Logo must be an uploaded image (TENANT_LOGO) of at most 2 MB',
      );
    }
  }
}
