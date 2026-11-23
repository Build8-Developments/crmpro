import { Injectable } from '@nestjs/common';
import type { Prisma, TenantSettings } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Single read path for organization settings. Other modules should depend on
 * this service instead of hard-coding policy (see docs/product/settings-spec.md).
 */
@Injectable()
export class TenantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the tenant's settings, creating the defaults row if it is missing
   * (e.g. a tenant created by a path that predates provisioning support).
   */
  async get(
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TenantSettings> {
    const client = tx ?? this.prisma;
    return client.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });
  }
}
