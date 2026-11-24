import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { MailService } from '../mail/mail.service';
import { workspaceLinksEmail } from '../mail/templates/auth-emails';
import { LOGO_URL_EXPIRY_SECONDS } from '../organization/organization.constants';
import type { WorkspaceLookupResult } from './types/workspace-lookup-result.type';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  /** `sendWorkspaceLinks` in the background; failures are logged, never thrown. */
  queueWorkspaceLinks(email: string): void {
    this.sendWorkspaceLinks(email).catch((error: unknown) => {
      this.logger.error(
        `Workspace links failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  /**
   * "Find my workspace": emails links to every workspace this address can
   * sign in to. Sends nothing when there is none, and the caller always gets
   * the same answer, so it never reveals whether an account exists.
   */
  async sendWorkspaceLinks(email: string): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        email: { equals: email, mode: 'insensitive' },
        isActive: true,
        deletedAt: null,
        tenant: { deletedAt: null },
      },
      select: { email: true, tenant: { select: { name: true, slug: true } } },
      orderBy: { tenant: { name: 'asc' } },
      take: 20,
    });
    if (users.length === 0) return;

    const message = workspaceLinksEmail({
      workspaces: users.map((user) => ({
        name: user.tenant.name,
        url: this.mail.workspaceUrl(user.tenant.slug, '/login'),
      })),
    });
    await this.mail.send({ to: users[0].email, ...message });
    this.logger.log(`Workspace links sent (${users.length} workspace(s))`);
  }

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
