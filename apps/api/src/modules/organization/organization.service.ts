import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, FileAssetCategory } from '@crmpro/database';
import { loadTenantPlanTerms } from '../../common/entitlements/tenant-plan-terms';
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
import { SYSTEM_LEAD_SCOPE } from '../../common/auth';

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

/** Settings fields that PATCH /organization/settings may change. */
const SETTINGS_KEYS = [
  'countryCode',
  'timezone',
  'currency',
  'weekStartsOn',
  'workingDays',
  'workdayStartMinute',
  'workdayEndMinute',
  'firstContactSlaMinutes',
  'escalateAfterMinutes',
  'dailyInteractionGoal',
  'showLeaderboardToAgents',
] as const;

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
      this.assertWorkdayConsistent(before, dto);

      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of SETTINGS_KEYS) {
        const raw = dto[key];
        const next =
          key === 'workingDays' && Array.isArray(raw)
            ? [...raw].sort((a, b) => a - b)
            : raw;
        if (
          next !== undefined &&
          JSON.stringify(next) !== JSON.stringify(before[key])
        ) {
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

    const file = await this.files.completeUpload(
      user.tenantId,
      user.id,
      {
        objectKey: dto.objectKey,
        category: FileAssetCategory.LOGO,
      },
      SYSTEM_LEAD_SCOPE,
    );

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
      await this.files.deleteFile(
        before.logoFileId,
        user.tenantId,
        user.id,
        SYSTEM_LEAD_SCOPE,
      );
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
      await this.files.deleteFile(
        before.logoFileId,
        user.tenantId,
        user.id,
        SYSTEM_LEAD_SCOPE,
      );
    }

    return this.getOrganization(user.tenantId);
  }

  /**
   * Plan, contract terms and quota usage. Read-only: the platform sets these.
   * Limits and features are the contract's signed snapshot (what is
   * enforced); price and payment terms only with `includePricing`.
   */
  async getUsage(
    tenantId: string,
    options: { includePricing?: boolean } = {},
  ): Promise<OrganizationUsageResponse> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        status: true,
        storageUsedBytes: true,
        subscriptionPlan: { select: { name: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Organization not found');
    }

    const terms = await loadTenantPlanTerms(this.prisma, tenantId);
    const contract = terms.contractId
      ? await this.prisma.tenantContract.findFirst({
          where: { id: terms.contractId, tenantId },
          select: {
            status: true,
            contractStartAt: true,
            contractEndAt: true,
            gracePeriodDays: true,
            autoRenew: true,
            agreedPrice: true,
            currency: true,
            paymentMethod: true,
            paymentFrequency: true,
            terminatedAt: true,
            terminationMode: true,
            accessEndsAt: true,
          },
        })
      : null;

    // Counted the same way QuotaService enforces the limits.
    const [users, leads, projects] = await Promise.all([
      this.prisma.user.count({
        where: { tenantId, deletedAt: null, isActive: true },
      }),
      this.prisma.lead.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.project.count({ where: { tenantId, deletedAt: null } }),
    ]);

    const { quotas, featureFlags, snapshot } = terms;
    const planName = snapshot?.name || tenant.subscriptionPlan.name;

    return {
      plan: {
        name: planName,
        features: {
          analytics: featureFlags.analytics === true,
          importExport: featureFlags.importExport === true,
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
            planName,
            pricing: options.includePricing
              ? {
                  agreedPrice: contract.agreedPrice.toNumber(),
                  currency: contract.currency,
                  paymentMethod: contract.paymentMethod,
                  paymentFrequency: contract.paymentFrequency,
                }
              : null,
            termination:
              contract.status === ContractStatus.TERMINATED
                ? {
                    mode: contract.terminationMode,
                    terminatedAt: contract.terminatedAt,
                    accessEndsAt: contract.accessEndsAt,
                  }
                : null,
          }
        : null,
      limits: {
        source: terms.source,
        capturedAt: snapshot?.capturedAt ?? null,
      },
      usage: {
        users: { used: users, limit: quotas.maxUsers },
        leads: { used: leads, limit: quotas.maxLeads },
        projects: { used: projects, limit: quotas.maxProjects },
        storageBytes: {
          used: Number(tenant.storageUsedBytes),
          limit:
            quotas.maxStorageBytes === null
              ? null
              : Number(quotas.maxStorageBytes),
        },
      },
    };
  }

  /** Short-lived signed URL for a logo object, or null when there is none. */
  async signLogoUrl(
    objectKey: string | null | undefined,
  ): Promise<string | null> {
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

  /** Validates the workday against the values that are not being changed. */
  private assertWorkdayConsistent(
    before: OrganizationSettingsResponse,
    dto: UpdateOrganizationSettingsDto,
  ): void {
    const start = dto.workdayStartMinute ?? before.workdayStartMinute;
    const end = dto.workdayEndMinute ?? before.workdayEndMinute;
    if (end - start < 60) {
      throw new BadRequestException(
        'The workday must end at least an hour after it starts',
      );
    }
    const sla = dto.firstContactSlaMinutes ?? before.firstContactSlaMinutes;
    const escalate = dto.escalateAfterMinutes ?? before.escalateAfterMinutes;
    if (escalate <= sla) {
      throw new BadRequestException(
        'Managers must be alerted after the first-call deadline, not before it',
      );
    }
  }

  private toSettingsResponse(
    settings: OrganizationSettingsResponse,
  ): OrganizationSettingsResponse {
    return {
      countryCode: settings.countryCode,
      timezone: settings.timezone,
      currency: settings.currency,
      weekStartsOn: settings.weekStartsOn,
      workingDays: [...settings.workingDays].sort((a, b) => a - b),
      workdayStartMinute: settings.workdayStartMinute,
      workdayEndMinute: settings.workdayEndMinute,
      firstContactSlaMinutes: settings.firstContactSlaMinutes,
      escalateAfterMinutes: settings.escalateAfterMinutes,
      dailyInteractionGoal: settings.dailyInteractionGoal,
      showLeaderboardToAgents: settings.showLeaderboardToAgents,
      updatedAt: settings.updatedAt,
    };
  }
}
