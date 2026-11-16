import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContractStatus, FileAssetCategory } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { FilesService } from '../files/files.service';
import { CompleteLogoUploadDto } from './dto/complete-logo-upload.dto';
import { RequestLogoUploadDto } from './dto/request-logo-upload.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  LOGO_URL_EXPIRY_SECONDS,
  ORGANIZATION_AUDIT_ACTIONS,
} from './organization.constants';
import type {
  OrganizationResponse,
  OrganizationSettingsResponse,
  OrganizationUsageResponse,
} from './organization.types';
import { TenantSettingsService } from './tenant-settings.service';

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly files: FilesService,
    private readonly auditWriter: AuditWriterService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

  async getOrganization(tenantId: string): Promise<OrganizationResponse> {
    const tenant = await this.getTenantOrThrow(tenantId);
    const settings = await this.tenantSettings.get(tenantId);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      logoUrl: await this.signLogoUrl(tenant.logoFile?.objectKey),
      settings: this.toSettingsResponse(settings),
    };
  }

  async updateOrganization(
    user: AuthenticatedUser,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponse> {
    const before = await this.getTenantOrThrow(user.tenantId);

    if (before.name !== dto.name) {
      await this.prisma.$transaction(async (tx) => {
        await tx.tenant.update({
          where: { id: user.tenantId },
          data: { name: dto.name },
        });
        await this.auditWriter.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: ORGANIZATION_AUDIT_ACTIONS.UPDATED,
          entityType: 'Tenant',
          entityId: user.tenantId,
          metadata: { changes: { name: { from: before.name, to: dto.name } } },
          tx,
        });
      });
    }

    return this.getOrganization(user.tenantId);
  }

  async getSettings(tenantId: string): Promise<OrganizationSettingsResponse> {
    return this.toSettingsResponse(await this.tenantSettings.get(tenantId));
  }

  async updateSettings(
    user: AuthenticatedUser,
    dto: UpdateOrganizationSettingsDto,
  ): Promise<OrganizationSettingsResponse> {
    if (dto.currency !== undefined && !SUPPORTED_CURRENCIES.has(dto.currency)) {
      throw new BadRequestException('currency must be an ISO-4217 code');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await this.tenantSettings.get(user.tenantId, tx);

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of [
        'countryCode',
        'timezone',
        'currency',
        'weekStartsOn',
      ] as const) {
        const next = dto[key];
        if (next !== undefined && next !== before[key]) {
          changes[key] = { from: before[key], to: next };
        }
      }

      if (Object.keys(changes).length === 0) {
        return before;
      }

      const after = await tx.tenantSettings.update({
        where: { tenantId: user.tenantId },
        data: {
          ...Object.fromEntries(
            Object.entries(changes).map(([key, change]) => [key, change.to]),
          ),
          updatedByUserId: user.id,
        },
      });

      await this.auditWriter.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: ORGANIZATION_AUDIT_ACTIONS.SETTINGS_UPDATED,
        entityType: 'TenantSettings',
        entityId: user.tenantId,
        metadata: { changes },
        tx,
      });

      return after;
    });

    return this.toSettingsResponse(updated);
  }

  requestLogoUpload(user: AuthenticatedUser, dto: RequestLogoUploadDto) {
    return this.files.requestUpload(user.tenantId, user.id, dto);
  }

  /**
   * Finalizes an uploaded logo: records it as a LOGO file, points the tenant
   * at it, and deletes the previous logo file.
   */
  async completeLogoUpload(
    user: AuthenticatedUser,
    dto: CompleteLogoUploadDto,
  ): Promise<OrganizationResponse> {
    const before = await this.getTenantOrThrow(user.tenantId);

    const file = await this.files.completeUpload(user.tenantId, user.id, {
      objectKey: dto.objectKey,
      category: FileAssetCategory.LOGO,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: user.tenantId },
        data: { logoFileId: file.id },
      });
      await this.auditWriter.createAuditLog({
        tenantId: user.tenantId,
        actorUserId: user.id,
        action: ORGANIZATION_AUDIT_ACTIONS.LOGO_UPDATED,
        entityType: 'Tenant',
        entityId: user.tenantId,
        metadata: { fileId: file.id, previousFileId: before.logoFileId },
        tx,
      });
    });

    if (before.logoFileId) {
      await this.files.deleteFile(before.logoFileId, user.tenantId, user.id);
    }

    return this.getOrganization(user.tenantId);
  }

  async removeLogo(user: AuthenticatedUser): Promise<OrganizationResponse> {
    const before = await this.getTenantOrThrow(user.tenantId);

    if (before.logoFileId) {
      await this.prisma.$transaction(async (tx) => {
        await tx.tenant.update({
          where: { id: user.tenantId },
          data: { logoFileId: null },
        });
        await this.auditWriter.createAuditLog({
          tenantId: user.tenantId,
          actorUserId: user.id,
          action: ORGANIZATION_AUDIT_ACTIONS.LOGO_REMOVED,
          entityType: 'Tenant',
          entityId: user.tenantId,
          metadata: { fileId: before.logoFileId },
          tx,
        });
      });
      await this.files.deleteFile(before.logoFileId, user.tenantId, user.id);
    }

    return this.getOrganization(user.tenantId);
  }

  /** Plan, contract and quota usage. Read-only: the platform sets these. */
  async getUsage(tenantId: string): Promise<OrganizationUsageResponse> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        status: true,
        storageUsedBytes: true,
        subscriptionPlan: {
          select: {
            name: true,
            featureFlags: true,
            maxUsers: true,
            maxLeads: true,
            maxProjects: true,
            maxStorageBytes: true,
          },
        },
        contracts: {
          where: { deletedAt: null, status: ContractStatus.ACTIVE },
          orderBy: { contractStartAt: 'desc' },
          take: 1,
          select: {
            status: true,
            contractStartAt: true,
            contractEndAt: true,
            gracePeriodDays: true,
            autoRenew: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }

    // Counted the same way QuotaService enforces the limits.
    const [users, leads, projects] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, deletedAt: null, isActive: true },
      }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.project.count({ where: { tenantId, deletedAt: null } }),
    ]);

    const plan = tenant.subscriptionPlan;
    const flags = (plan.featureFlags ?? {}) as Record<string, unknown>;
    const contract = tenant.contracts[0] ?? null;

    return {
      plan: {
        name: plan.name,
        features: {
          analytics: flags.analytics === true,
          importExport: flags.importExport === true,
        },
      },
      status: tenant.status,
      contract: contract
        ? {
            status: contract.status,
            startsAt: contract.contractStartAt,
            endsAt: contract.contractEndAt,
            gracePeriodDays: contract.gracePeriodDays,
            autoRenew: contract.autoRenew,
          }
        : null,
      usage: {
        users: { used: users, limit: plan.maxUsers },
        leads: { used: leads, limit: plan.maxLeads },
        projects: { used: projects, limit: plan.maxProjects },
        storageBytes: {
          used: Number(tenant.storageUsedBytes),
          limit:
            plan.maxStorageBytes === null ? null : Number(plan.maxStorageBytes),
        },
      },
    };
  }

  /** Short-lived signed URL for a logo object, or null when there is none. */
  async signLogoUrl(objectKey: string | null | undefined): Promise<string | null> {
    if (!objectKey) return null;
    const signed = await this.storage.getSignedDownloadUrl({
      objectKey,
      expiresInSeconds: LOGO_URL_EXPIRY_SECONDS,
    });
    return signed.url;
  }

  private async getTenantOrThrow(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        logoFileId: true,
        logoFile: { select: { objectKey: true, deletedAt: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }

    return {
      ...tenant,
      logoFile: tenant.logoFile?.deletedAt ? null : tenant.logoFile,
    };
  }

  private toSettingsResponse(settings: {
    countryCode: string;
    timezone: string;
    currency: string;
    weekStartsOn: number;
    updatedAt: Date;
  }): OrganizationSettingsResponse {
    return {
      countryCode: settings.countryCode,
      timezone: settings.timezone,
      currency: settings.currency,
      weekStartsOn: settings.weekStartsOn,
      updatedAt: settings.updatedAt,
    };
  }
}
