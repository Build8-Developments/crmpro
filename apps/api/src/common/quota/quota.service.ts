import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QUOTA_EXCEEDED_MESSAGES } from './quota.constants';
import type { TenantPlanLimits } from './quota.types';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanCreateLead(tenantId: string): Promise<void> {
    if (!(await this.canCreateLead(tenantId))) {
      throw new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.LEAD);
    }
  }

  async canCreateLead(tenantId: string): Promise<boolean> {
    const plan = await this.getTenantPlanLimits(tenantId);

    if (plan.maxLeads === null) {
      return true;
    }

    const used = await this.prisma.lead.count({
      where: { tenantId, deletedAt: null },
    });

    return used < plan.maxLeads;
  }

  async assertCanCreateProject(tenantId: string): Promise<void> {
    if (!(await this.canCreateProject(tenantId))) {
      throw new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.PROJECT);
    }
  }

  async canCreateProject(tenantId: string): Promise<boolean> {
    const plan = await this.getTenantPlanLimits(tenantId);

    if (plan.maxProjects === null) {
      return true;
    }

    const used = await this.prisma.project.count({
      where: { tenantId, deletedAt: null },
    });

    return used < plan.maxProjects;
  }

  async assertCanCreateUser(tenantId: string): Promise<void> {
    if (!(await this.canCreateUser(tenantId))) {
      throw new ForbiddenException(QUOTA_EXCEEDED_MESSAGES.USER);
    }
  }

  async canCreateUser(tenantId: string): Promise<boolean> {
    const plan = await this.getTenantPlanLimits(tenantId);

    if (plan.maxUsers === null) {
      return true;
    }

    const used = await this.prisma.user.count({
      where: { tenantId, deletedAt: null, isActive: true },
    });

    return used < plan.maxUsers;
  }

  async getTenantPlanLimits(tenantId: string): Promise<TenantPlanLimits> {
    return this.loadTenantPlanLimits(tenantId);
  }

  private async loadTenantPlanLimits(
    tenantId: string,
  ): Promise<TenantPlanLimits> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: {
        subscriptionPlan: {
          select: {
            maxUsers: true,
            maxLeads: true,
            maxProjects: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant.subscriptionPlan;
  }
}
