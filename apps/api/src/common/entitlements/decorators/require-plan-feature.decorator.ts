import { SetMetadata } from '@nestjs/common';
import type { PlanFeatureKey } from '../entitlement.types';
import { PLAN_FEATURE_METADATA_KEY } from '../entitlement.constants';

export const RequirePlanFeature = (feature: PlanFeatureKey) =>
  SetMetadata(PLAN_FEATURE_METADATA_KEY, feature);
