import type { PipelineCloseType } from '../leads/lead-stage.util';
import type { PermissionKey } from '../auth/permissions';

export type TenantRoleDefinition = {
  readonly name: string;
  readonly description: string;
};

export type PipelineStageDefinition = {
  readonly name: string;
  readonly color: string;
  readonly isClosed: boolean;
  readonly closeType: PipelineCloseType | null;
};

export type TenantRolePermissionMap = {
  readonly owner: readonly PermissionKey[];
  readonly manager: readonly PermissionKey[];
  readonly agent: readonly PermissionKey[];
};
