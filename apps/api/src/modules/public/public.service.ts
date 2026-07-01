import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { WorkspaceLookupResult } from './types/workspace-lookup-result.type';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async lookupWorkspaceBySlug(slug: string): Promise<WorkspaceLookupResult> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
      select: { name: true, slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      exists: true,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: null,
    };
  }
}
