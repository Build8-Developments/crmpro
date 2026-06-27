import { InterestLevel, LeadStatus } from '@prisma/client';

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
