import { BadRequestException, Injectable } from '@nestjs/common';
import { TenantSettings } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

export const TENANT_SETTINGS_AUDIT_ACTION = 'TENANT_SETTINGS_UPDATED';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  /** Settings row, created with defaults on first access. */
  async get(tenantId: string): Promise<TenantSettings> {
    return this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });
  }

  async update(
    tenantId: string,
    actorUserId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettings> {
    if (dto.timezone !== undefined && !isValidTimeZone(dto.timezone)) {
      throw new BadRequestException('Unknown timezone');
    }

    const previous = await this.get(tenantId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenantSettings.update({
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

      return updated;
    });
  }
}
