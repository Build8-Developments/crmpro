import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type LeadStatus = "OPEN" | "ARCHIVED";

export type PipelineCloseType = "WON" | "LOST" | null;

export type InterestLevel = "LOW" | "MEDIUM" | "HIGH" | "HOT" | null;

export interface LeadSourceSummary {
  id: string;
  name: string;
}

export interface LeadPipelineSummary {
  id: string;
  name: string;
}

export interface LeadStageSummary {
  id: string;
  name: string;
  isClosed: boolean;
  closeType: PipelineCloseType;
  color: string | null;
}

export interface LeadAssigneeSummary {
  id: string;
  name: string;
}

export interface LeadProjectSummary {
  id: string;
  name: string;
}

export interface LeadProjectInterest {
  projectId: string;
  interestLevel: InterestLevel;
  project: LeadProjectSummary;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  fullName: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  source: LeadSourceSummary | null;
  pipeline: LeadPipelineSummary;
  stage: LeadStageSummary;
  assignee: LeadAssigneeSummary | null;
  projectInterests: LeadProjectInterest[];
}

export interface LeadsListParams extends ListQueryParams {
  pipelineId?: string;
  stageId?: string;
  sourceId?: string;
  assignedUserId?: string;
  status?: LeadStatus;
  projectId?: string;
}

export type LeadsListResponse = PaginatedResponse<Lead>;
