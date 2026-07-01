import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type PipelineCloseType = "WON" | "LOST";

export interface PipelineStage {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  isSystem: boolean;
  isClosed: boolean;
  closeType: PipelineCloseType | null;
  leadCount: number;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  stages: PipelineStage[];
}

export interface CreatePipelineInput {
  name: string;
  isDefault?: boolean;
}

export interface UpdatePipelineInput {
  name?: string;
  isDefault?: boolean;
}

export interface CreateStageInput {
  name: string;
  sortOrder: number;
  color?: string;
  isClosed?: boolean;
  closeType?: PipelineCloseType;
}

export interface UpdateStageInput {
  name?: string;
  sortOrder?: number;
  color?: string | null;
  isClosed?: boolean;
  closeType?: PipelineCloseType | null;
}

export type PipelinesListParams = ListQueryParams;

export type PipelinesListResponse = PaginatedResponse<Pipeline>;
