import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type PipelineCloseType = "WON" | "LOST";

export interface PipelineStage {
  id: string;
  name: string;
  sortOrder: number;
  color: string | null;
  icon: string | null;
  isSystem: boolean;
  isClosed: boolean;
  closeType: PipelineCloseType | null;
  /** R8: revive call after this many days without contact; null = off. */
  staleAfterDays: number | null;
  /** R9: manager review after this many days in the stage; null = off. */
  stuckAfterDays: number | null;
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
  icon?: string | null;
  isClosed?: boolean;
  closeType?: PipelineCloseType;
  /** Omitted = 7 days; null = off. */
  staleAfterDays?: number | null;
  stuckAfterDays?: number | null;
}

export interface UpdateStageInput {
  name?: string;
  sortOrder?: number;
  color?: string | null;
  icon?: string | null;
  isClosed?: boolean;
  closeType?: PipelineCloseType | null;
  staleAfterDays?: number | null;
  stuckAfterDays?: number | null;
}

export type PipelinesListParams = ListQueryParams;

export type PipelinesListResponse = PaginatedResponse<Pipeline>;
