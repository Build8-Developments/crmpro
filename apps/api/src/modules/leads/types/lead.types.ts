import { InterestLevel, LeadStatus, PipelineCloseType } from '@crmpro/database';

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
  closeType: PipelineCloseType | null;
}

export interface LeadAssigneeSummary {
  id: string;
  name: string;
}

export interface LeadProjectSummary {
  id: string;
  name: string;
}

export interface LeadProjectInterestResponse {
  projectId: string;
  interestLevel: InterestLevel | null;
  project: LeadProjectSummary;
}

export interface LeadResponse {
  id: string;
  status: LeadStatus;
  fullName: string;
  primaryPhone: string;
  secondaryPhone: string | null;
  email: string | null;
  lastContactedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  source: LeadSourceSummary | null;
  pipeline: LeadPipelineSummary;
  stage: LeadStageSummary;
  assignee: LeadAssigneeSummary | null;
  projectInterests: LeadProjectInterestResponse[];
}

export interface DuplicateMatch {
  id: string;
  fullName: string;
}

export interface DuplicateWarning {
  detected: true;
  matches: DuplicateMatch[];
}

export interface LeadMutationResult {
  lead: LeadResponse;
  duplicateWarning: DuplicateWarning | null;
}

export interface LeadActivityResponse {
  id: string;
  tenantId: string;
  leadId: string;
  actorUserId: string | null;
  eventType: string;
  metadata: unknown;
  createdAt: Date;
}

export interface LeadWorkflowResult {
  lead: LeadResponse;
  activity: LeadActivityResponse;
}

export interface LeadNoteAuthorSummary {
  id: string;
  email: string;
}

export interface LeadNoteResponse {
  id: string;
  content: string;
  author: LeadNoteAuthorSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivityActorSummary {
  id: string;
  email: string;
}

export interface LeadTimelineActivityResponse {
  id: string;
  eventType: string;
  metadata: unknown;
  actor: LeadActivityActorSummary | null;
  createdAt: Date;
}

export interface ImportLeadRowInput {
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string | null;
  email?: string | null;
  sourceId?: string | null;
  assignedUserId?: string | null;
}

export interface DefaultPipelinePlacement {
  pipelineId: string;
  pipelineStageId: string;
}

export type ImportLeadRowResult =
  | { success: true; leadId: string }
  | { success: false; reason: string };

export interface LeadListFilters {
  pipelineId?: string;
  stageId?: string;
  sourceId?: string;
  assignedUserId?: string;
  status?: LeadStatus;
  projectId?: string;
  search?: string;
}

export interface LeadExportParams extends LeadListFilters {
  sortBy?: string;
  sortOrder?: string;
}
