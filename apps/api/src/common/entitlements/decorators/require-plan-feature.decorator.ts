import { SetMetadata } from '@nestjs/common';
import type { PlanFeatureKey } from '../entitlement.types';
import {
  PLAN_FEATURE_METADATA_KEY,
  WAIVE_FEATURE_WHEN_READ_ONLY_KEY,
} from '../entitlement.constants';

export const RequirePlanFeature = (feature: PlanFeatureKey) =>
  SetMetadata(PLAN_FEATURE_METADATA_KEY, feature);

/**
 * The plan feature is not required while the workspace is read-only (its
 * contract ended in READ_ONLY mode): exporting your own data stays possible
 * at the end of a contract even on a plan without the feature.
 */
export const WaiveFeatureWhenReadOnly = () =>
  SetMetadata(WAIVE_FEATURE_WHEN_READ_ONLY_KEY, true);
