import type { PipelineCloseType } from '@crmpro/database';

export interface PipelineStageResponse {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isSystem: boolean;
  isClosed: boolean;
  closeType: PipelineCloseType | null;
}

export interface PipelineResponse {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  stages: PipelineStageResponse[];
}
