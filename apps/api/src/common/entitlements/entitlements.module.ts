import { Module } from '@nestjs/common';
import { PlanEntitlementGuard } from './guards/plan-entitlement.guard';
import { PlanEntitlementService } from './plan-entitlement.service';

@Module({
  providers: [PlanEntitlementService, PlanEntitlementGuard],
  exports: [PlanEntitlementService, PlanEntitlementGuard],
})
export class EntitlementsModule {}
