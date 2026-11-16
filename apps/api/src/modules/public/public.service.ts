import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { LOGO_URL_EXPIRY_SECONDS } from '../organization/organization.constants';
import type { WorkspaceLookupResult } from './types/workspace-lookup-result.type';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async lookupWorkspaceBySlug(slug: string): Promise<WorkspaceLookupResult> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      select: {
        name: true,
        slug: true,
        logoFile: { select: { objectKey: true, deletedAt: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Workspace not found');
    }

    const logoKey =
      tenant.logoFile && !tenant.logoFile.deletedAt
        ? tenant.logoFile.objectKey
        : null;

    return {
      exists: true,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: logoKey
        ? (
            await this.storage.getSignedDownloadUrl({
              objectKey: logoKey,
              expiresInSeconds: LOGO_URL_EXPIRY_SECONDS,
            })
          ).url
        : null,
    };
  }
}
