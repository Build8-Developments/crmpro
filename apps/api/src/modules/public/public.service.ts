import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantSettingsService } from '../tenant-settings/tenant-settings.service';
import type { WorkspaceLookupResult } from './types/workspace-lookup-result.type';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantSettings: TenantSettingsService,
  ) {}

  async lookupWorkspaceBySlug(slug: string): Promise<WorkspaceLookupResult> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      exists: true,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: await this.tenantSettings.getLogoUrl(tenant.id),
    };
  }
}
