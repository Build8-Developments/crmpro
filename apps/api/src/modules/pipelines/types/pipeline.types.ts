import type { PipelineCloseType } from '@crmpro/database';

/** Bounds of a stage's R8/R9 day thresholds (DB CHECK constraint too). */
export const STAGE_RULE_DAYS_MIN = 1;
export const STAGE_RULE_DAYS_MAX = 365;
/** R8 threshold of a new open stage when none is given. */
export const DEFAULT_STALE_AFTER_DAYS = 7;

export interface PipelineStageResponse {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  isClosed: boolean;
  closeType: PipelineCloseType | null;
  /** R8: days without contact before a "revive" call; null = off. */
  staleAfterDays: number | null;
  /** R9: days in the stage before a manager review; null = off. */
  stuckAfterDays: number | null;
  leadCount: number;
}

export interface PipelineResponse {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  stages: PipelineStageResponse[];
}
