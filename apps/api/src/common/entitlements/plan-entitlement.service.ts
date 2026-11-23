import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FEATURE_UNAVAILABLE_MESSAGE } from './entitlement.constants';
import type { PlanFeatureFlags, PlanFeatureKey } from './entitlement.types';
import { loadTenantPlanTerms } from './tenant-plan-terms';

@Injectable()
export class PlanEntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async assertFeatureEnabled(
    tenantId: string,
    feature: PlanFeatureKey,
  ): Promise<void> {
    const flags = await this.getFeatureFlags(tenantId);

    if (flags[feature] !== true) {
      throw new ForbiddenException(FEATURE_UNAVAILABLE_MESSAGE);
    }
  }

  /**
   * Flags frozen in the contract's plan snapshot, plus flags added to the
   * plan since signing (from the live plan). Live plan only without a snapshot.
   */
  async getFeatureFlags(tenantId: string): Promise<PlanFeatureFlags> {
    const terms = await loadTenantPlanTerms(this.prisma, tenantId);
    return terms.featureFlags;
  }
}
