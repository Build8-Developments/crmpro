import { Injectable } from '@nestjs/common';
import { Prisma, Tenant } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';

const userWithRoleAndTenant = Prisma.validator<Prisma.UserDefaultArgs>()({
  include: { role: true, tenant: true },
});

export type UserWithRoleAndTenant = Prisma.UserGetPayload<
  typeof userWithRoleAndTenant
>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithRoleAndTenant | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true, tenant: true },
    });
  }

  async findTenantBySlug(slug: string): Promise<Tenant | null> {
    return this.prisma.tenant.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findByTenantAndEmail(
    tenantSlug: string,
    email: string,
  ): Promise<UserWithRoleAndTenant | null> {
    const tenant = await this.findTenantBySlug(tenantSlug);
    if (!tenant) {
      return null;
    }

    return this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
      },
      include: { role: true, tenant: true },
    });
  }
}
