import type { PipelineCloseType } from '../leads/lead-stage.util';
import type { PermissionKey } from '../auth/permissions';

export type TenantRoleDefinition = {
  readonly name: string;
  readonly description: string;
};

export type PipelineStageDefinition = {
  readonly name: string;
  readonly color: string;
  /** Icon key from STAGE_ICON_KEYS. */
  readonly icon: string;
  readonly isClosed: boolean;
  readonly closeType: PipelineCloseType | null;
  /** R8 "revive" after this many days without an interaction (null = off). */
  readonly staleAfterDays: number | null;
  /** R9 manager review after this many days in the stage (null = off). */
  readonly stuckAfterDays: number | null;
};

export type TenantRolePermissionMap = {
  readonly owner: readonly PermissionKey[];
  readonly manager: readonly PermissionKey[];
  readonly agent: readonly PermissionKey[];
};
